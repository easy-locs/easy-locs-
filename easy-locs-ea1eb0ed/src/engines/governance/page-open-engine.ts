import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import type {
  GovernanceViolation,
  CanonicalVertical,
  GovernanceSeverity,
} from "@/domains/shared/canonical-types";
import { platformBus } from "@/lib/shared/platform-bus";

export type PageOpenState =
  | "route_enter"
  | "data_request"
  | "dependency_resolution"
  | "layout_mount"
  | "first_stable_paint"
  | "interaction_ready"
  | "error"
  | "retry"
  | "abandoned";

export type PageOpenFailureType =
  | "blank_page"
  | "partial_mount"
  | "infinite_spinner"
  | "missing_dependency"
  | "auth_transition"
  | "invalid_params"
  | "failed_deep_link"
  | "broken_retry"
  | "layout_crash";

interface PageOpenRecord {
  pageId: string;
  route: string;
  state: PageOpenState;
  startedAt: number;
  completedAt: number | null;
  failureType: PageOpenFailureType | null;
  duration: number | null;
  retries: number;
  metadata: Record<string, unknown>;
}

const pageOpenLog: PageOpenRecord[] = [];
const pageOpenViolations: GovernanceViolation[] = [];
const PAGE_OPEN_TIMEOUT = 10_000;
const MAX_LOG_SIZE = 500;

const activePages = new Map<string, PageOpenRecord>();

export function trackPageOpen(pageId: string, route: string): void {
  const record: PageOpenRecord = {
    pageId,
    route,
    state: "route_enter",
    startedAt: Date.now(),
    completedAt: null,
    failureType: null,
    duration: null,
    retries: 0,
    metadata: {},
  };
  activePages.set(pageId, record);

  setTimeout(() => {
    const active = activePages.get(pageId);
    if (active && active.state !== "interaction_ready") {
      active.state = "error";
      active.failureType = classifyFailure(active);
      active.completedAt = Date.now();
      active.duration = active.completedAt - active.startedAt;
      finalizeRecord(active);
      activePages.delete(pageId);
    }
  }, PAGE_OPEN_TIMEOUT);
}

export function updatePageState(pageId: string, state: PageOpenState): void {
  const active = activePages.get(pageId);
  if (!active) return;

  active.state = state;

  if (state === "interaction_ready") {
    active.completedAt = Date.now();
    active.duration = active.completedAt - active.startedAt;
    finalizeRecord(active);
    activePages.delete(pageId);
  } else if (state === "error") {
    active.failureType = classifyFailure(active);
    active.completedAt = Date.now();
    active.duration = active.completedAt - active.startedAt;
    finalizeRecord(active);
    activePages.delete(pageId);
  } else if (state === "retry") {
    active.retries++;
  }
}

function classifyFailure(record: PageOpenRecord): PageOpenFailureType {
  switch (record.state) {
    case "route_enter":
      return "blank_page";
    case "data_request":
      return "infinite_spinner";
    case "dependency_resolution":
      return "missing_dependency";
    case "layout_mount":
      return "partial_mount";
    case "retry":
      return "broken_retry";
    default:
      return "blank_page";
  }
}

function finalizeRecord(record: PageOpenRecord): void {
  pageOpenLog.push(record);
  if (pageOpenLog.length > MAX_LOG_SIZE) {
    pageOpenLog.splice(0, pageOpenLog.length - MAX_LOG_SIZE);
  }

  if (record.failureType) {
    const v: GovernanceViolation = {
      id: `pageopen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "dead_action",
      severity: (record.failureType === "blank_page" || record.failureType === "layout_crash" ? "critical" : "error") as GovernanceSeverity,
      source: `page:${record.pageId}`,
      target: `route:${record.route}`,
      message: `Page open failure: ${record.failureType} on ${record.route} (${record.duration ?? 0}ms)`,
      ownerDomain: "platform",
      vertical: "platform" as unknown as CanonicalVertical,
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      autoRemediated: false,
      metadata: { pageId: record.pageId, route: record.route, failureType: record.failureType, duration: record.duration },
    };
    pageOpenViolations.push(v);

    platformBus.emit("ui-engine:report" as any, {
      engineId: "page-open-reliability",
      failure: {
        pageId: record.pageId,
        route: record.route,
        type: record.failureType,
        duration: record.duration,
      },
    });
  }
}

export function getPageOpenLog(): PageOpenRecord[] {
  return [...pageOpenLog];
}

export function getPageOpenViolations(): GovernanceViolation[] {
  return [...pageOpenViolations];
}

export function getPageOpenStats(): {
  total: number;
  successful: number;
  failed: number;
  avgDuration: number;
  failuresByType: Record<string, number>;
  topBrokenRoutes: { route: string; failures: number }[];
} {
  const total = pageOpenLog.length;
  const successful = pageOpenLog.filter((r) => r.state === "interaction_ready").length;
  const failed = pageOpenLog.filter((r) => r.failureType !== null).length;
  const durations = pageOpenLog
    .filter((r) => r.duration !== null && r.state === "interaction_ready")
    .map((r) => r.duration!);
  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  const failuresByType: Record<string, number> = {};
  const routeFailures: Record<string, number> = {};

  for (const r of pageOpenLog) {
    if (r.failureType) {
      failuresByType[r.failureType] = (failuresByType[r.failureType] ?? 0) + 1;
      routeFailures[r.route] = (routeFailures[r.route] ?? 0) + 1;
    }
  }

  const topBrokenRoutes = Object.entries(routeFailures)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, failures]) => ({ route, failures }));

  return { total, successful, failed, avgDuration, failuresByType, topBrokenRoutes };
}

export class PageOpenEngine extends BaseEngine {
  constructor() {
    super({
      id: "page-open-reliability",
      name: "Page Open Reliability Engine",
      category: "governance",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const stats = getPageOpenStats();
    const stalePages = Array.from(activePages.values()).filter(
      (p) => Date.now() - p.startedAt > PAGE_OPEN_TIMEOUT
    );

    for (const stale of stalePages) {
      stale.state = "error";
      stale.failureType = classifyFailure(stale);
      stale.completedAt = Date.now();
      stale.duration = stale.completedAt - stale.startedAt;
      finalizeRecord(stale);
      activePages.delete(stale.pageId);
    }

    const actions: string[] = [];
    if (stats.topBrokenRoutes.length > 0) {
      actions.push(
        ...stats.topBrokenRoutes
          .slice(0, 3)
          .map((r) => `BROKEN_ROUTE: ${r.route} (${r.failures} failures)`)
      );
    }

    return {
      level: stalePages.length > 0 ? "act" : stats.failed > 0 ? "detect" : "observe",
      findings: stalePages.length + stats.failed,
      actions,
      duration: 0,
    };
  }
}
