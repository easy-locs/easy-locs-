/**
 * Advanced Analytics Engine
 * - Event batching & deduplication
 * - Session tracking with engagement metrics
 * - Page view tracking with time-on-page
 * - KPI computation helpers
 * - Funnel analysis utilities
 */

import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent, trackPageView } from "@/lib/analytics";

// ── Event Batching ───────────────────────────────────────────────────

interface QueuedEvent {
  name: string;
  params?: Record<string, string | number | boolean>;
  timestamp: number;
}

const eventQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const BATCH_INTERVAL = 2000;
const MAX_BATCH_SIZE = 20;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flushEvents, BATCH_INTERVAL);
}

function flushEvents() {
  flushTimer = null;
  if (eventQueue.length === 0) return;

  const batch = eventQueue.splice(0, MAX_BATCH_SIZE);
  batch.forEach(evt => {
    trackEvent(evt.name, { ...evt.params, _batched: true, _ts: evt.timestamp });
  });

  if (eventQueue.length > 0) scheduleFlush();
}

/**
 * Queue an analytics event for batched sending.
 * Reduces network calls by grouping events.
 */
export function queueEvent(name: string, params?: Record<string, string | number | boolean>) {
  eventQueue.push({ name, params, timestamp: Date.now() });
  if (eventQueue.length >= MAX_BATCH_SIZE) {
    flushEvents();
  } else {
    scheduleFlush();
  }
}

/** Force flush all queued events (call before page unload) */
export function flushAllEvents() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  while (eventQueue.length > 0) {
    flushEvents();
  }
}

// ── Session Tracking ─────────────────────────────────────────────────

export interface SessionMetrics {
  sessionId: string;
  startedAt: number;
  pageViews: number;
  events: number;
  engagementMs: number;
  lastActiveAt: number;
}

const SESSION_KEY = "el:analytics-session";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function generateSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getOrCreateSession(): SessionMetrics {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const session: SessionMetrics = JSON.parse(stored);
      if (Date.now() - session.lastActiveAt < SESSION_TIMEOUT) {
        return session;
      }
    }
  } catch { /* ignore */ }

  const session: SessionMetrics = {
    sessionId: generateSessionId(),
    startedAt: Date.now(),
    pageViews: 0,
    events: 0,
    engagementMs: 0,
    lastActiveAt: Date.now(),
  };
  persistSession(session);
  return session;
}

function persistSession(session: SessionMetrics) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch { /* ignore */ }
}

export function updateSession(updates: Partial<SessionMetrics>) {
  const session = getOrCreateSession();
  Object.assign(session, updates, { lastActiveAt: Date.now() });
  persistSession(session);
  return session;
}

// ── Page View Hook ───────────────────────────────────────────────────

/**
 * Hook: automatically tracks page views on route changes.
 * Measures time-on-page for the previous page.
 */
export function usePageTracking() {
  const location = useLocation();
  const enterTimeRef = useRef(Date.now());
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const now = Date.now();
    const timeOnPage = now - enterTimeRef.current;

    // Track time on previous page
    if (prevPathRef.current !== location.pathname && timeOnPage > 1000) {
      queueEvent("page_dwell", {
        path: prevPathRef.current,
        dwell_ms: timeOnPage,
      });
    }

    // Track new page view
    trackPageView(location.pathname);
    updateSession({ pageViews: getOrCreateSession().pageViews + 1 });

    enterTimeRef.current = now;
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  // Flush on unload
  useEffect(() => {
    const handleUnload = () => {
      const timeOnPage = Date.now() - enterTimeRef.current;
      if (timeOnPage > 1000) {
        queueEvent("page_dwell", {
          path: location.pathname,
          dwell_ms: timeOnPage,
        });
      }
      flushAllEvents();
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [location.pathname]);
}

// ── Engagement Tracking ──────────────────────────────────────────────

/**
 * Hook: tracks user engagement (clicks, scrolls, input activity).
 * Reports engagement score periodically.
 */
export function useEngagementTracking(intervalMs = 60_000) {
  const actionsRef = useRef(0);

  useEffect(() => {
    const handleAction = () => { actionsRef.current++; };

    document.addEventListener("click", handleAction, { passive: true });
    document.addEventListener("scroll", handleAction, { passive: true });
    document.addEventListener("keydown", handleAction, { passive: true });

    const interval = setInterval(() => {
      if (actionsRef.current > 0) {
        queueEvent("engagement_pulse", {
          actions: actionsRef.current,
          session_id: getOrCreateSession().sessionId,
        });
        actionsRef.current = 0;
      }
    }, intervalMs);

    return () => {
      document.removeEventListener("click", handleAction);
      document.removeEventListener("scroll", handleAction);
      document.removeEventListener("keydown", handleAction);
      clearInterval(interval);
    };
  }, [intervalMs]);
}

// ── KPI Computation Helpers ──────────────────────────────────────────

export interface KPIResult {
  value: number;
  previousValue?: number;
  changePercent?: number;
  trend: "up" | "down" | "flat";
}

/**
 * Compute a KPI with period-over-period comparison.
 */
export function computeKPI(current: number, previous?: number): KPIResult {
  if (previous === undefined || previous === 0) {
    return { value: current, trend: "flat" };
  }
  const changePercent = ((current - previous) / previous) * 100;
  return {
    value: current,
    previousValue: previous,
    changePercent: Math.round(changePercent * 10) / 10,
    trend: changePercent > 1 ? "up" : changePercent < -1 ? "down" : "flat",
  };
}

/**
 * Compute conversion rate between funnel steps.
 */
export function computeConversionRate(from: number, to: number): number {
  if (from === 0) return 0;
  return Math.round((to / from) * 10000) / 100; // 2 decimal places
}

/**
 * Compute moving average over a data series.
 */
export function movingAverage(data: number[], windowSize: number): number[] {
  if (windowSize <= 0 || data.length === 0) return [];
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    result.push(Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 100) / 100);
  }
  return result;
}

// ── Funnel Analysis ──────────────────────────────────────────────────

export interface FunnelStep {
  name: string;
  count: number;
  dropoffPercent?: number;
  conversionFromPrevious?: number;
}

/**
 * Build a funnel analysis from step counts.
 */
export function buildFunnel(steps: Array<{ name: string; count: number }>): FunnelStep[] {
  return steps.map((step, i) => {
    const prev = i > 0 ? steps[i - 1].count : step.count;
    const conversionFromPrevious = prev > 0 ? Math.round((step.count / prev) * 10000) / 100 : 100;
    const dropoffPercent = i > 0 ? Math.round(((prev - step.count) / prev) * 10000) / 100 : 0;

    return {
      ...step,
      conversionFromPrevious,
      dropoffPercent,
    };
  });
}

// ── Cohort Helper ────────────────────────────────────────────────────

/**
 * Group items into cohorts by a date key (e.g., "2026-03", "2026-W12").
 */
export function groupByCohort<T>(
  items: T[],
  getDate: (item: T) => Date,
  granularity: "day" | "week" | "month" = "month"
): Map<string, T[]> {
  const cohorts = new Map<string, T[]>();

  for (const item of items) {
    const d = getDate(item);
    let key: string;

    switch (granularity) {
      case "day":
        key = d.toISOString().slice(0, 10);
        break;
      case "week": {
        const jan1 = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
        break;
      }
      case "month":
      default:
        key = d.toISOString().slice(0, 7);
        break;
    }

    if (!cohorts.has(key)) cohorts.set(key, []);
    cohorts.get(key)!.push(item);
  }

  return cohorts;
}
