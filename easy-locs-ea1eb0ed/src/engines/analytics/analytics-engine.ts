import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { reportHealth } from "@/lib/runtime/health-aggregator";

interface PageViewEvent {
  path: string;
  timestamp: number;
  sessionId: string;
  duration?: number;
}

interface ConversionEvent {
  funnel: string;
  step: string;
  timestamp: number;
  userId?: string;
}

interface SessionMetrics {
  sessionId: string;
  startedAt: number;
  pageViews: number;
  lastActivity: number;
}

const MAX_EVENTS = 500;
const pageViews: PageViewEvent[] = [];
const conversionEvents: ConversionEvent[] = [];
const sessions = new Map<string, SessionMetrics>();
let currentPath = "";
let currentPathStart = 0;

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

let _sessionId: string | null = null;
function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = sessionStorage.getItem("analytics_session_id");
    if (!_sessionId) {
      _sessionId = generateSessionId();
      sessionStorage.setItem("analytics_session_id", _sessionId);
    }
  }
  return _sessionId;
}

export function trackPageView(path: string): void {
  const sessionId = getSessionId();
  const now = Date.now();

  if (currentPath && currentPath !== path) {
    const duration = now - currentPathStart;
    const last = pageViews[pageViews.length - 1];
    if (last && last.path === currentPath) last.duration = duration;
  }

  currentPath = path;
  currentPathStart = now;

  const event: PageViewEvent = { path, timestamp: now, sessionId };
  pageViews.push(event);
  if (pageViews.length > MAX_EVENTS) pageViews.splice(0, pageViews.length - MAX_EVENTS);

  let session = sessions.get(sessionId);
  if (!session) {
    session = { sessionId, startedAt: now, pageViews: 0, lastActivity: now };
    sessions.set(sessionId, session);
  }
  session.pageViews++;
  session.lastActivity = now;
}

export function trackConversion(funnel: string, step: string, userId?: string): void {
  const event: ConversionEvent = { funnel, step, timestamp: Date.now(), userId };
  conversionEvents.push(event);
  if (conversionEvents.length > MAX_EVENTS) conversionEvents.splice(0, conversionEvents.length - MAX_EVENTS);
}

export function getAnalyticsSnapshot() {
  const sessionId = getSessionId();
  const session = sessions.get(sessionId);
  const totalSessions = sessions.size;
  const avgSessionDuration = Array.from(sessions.values())
    .reduce((sum, s) => sum + (s.lastActivity - s.startedAt), 0) / Math.max(totalSessions, 1);

  const pathCounts = new Map<string, number>();
  for (const pv of pageViews) {
    pathCounts.set(pv.path, (pathCounts.get(pv.path) || 0) + 1);
  }
  const topPaths = Array.from(pathCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  return {
    sessionId,
    currentSession: session ?? null,
    totalPageViews: pageViews.length,
    totalSessions,
    avgSessionDurationMs: Math.round(avgSessionDuration),
    topPaths,
    recentConversions: conversionEvents.slice(-20),
  };
}

export class AnalyticsEngine extends BaseEngine {
  constructor() {
    super({
      id: "analytics-engine",
      name: "Analytics Engine",
      category: "analytics",
      domain: "analytics",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const snapshot = getAnalyticsSnapshot();
    const actions: string[] = [];

    const staleSessions = Array.from(sessions.entries())
      .filter(([, s]) => Date.now() - s.lastActivity > 30 * 60_000);
    for (const [id] of staleSessions) sessions.delete(id);
    if (staleSessions.length > 0) actions.push(`Cleared ${staleSessions.length} stale sessions`);

    reportHealth("analytics-engine", "ok", 10);

    this.emit("snapshot", {
      totalPageViews: snapshot.totalPageViews,
      totalSessions: snapshot.totalSessions,
      activeSessions: sessions.size,
    });

    return {
      level: "observe",
      findings: snapshot.totalPageViews,
      actions,
      duration: 0,
    };
  }
}
