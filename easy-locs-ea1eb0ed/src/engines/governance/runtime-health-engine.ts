import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import type { GovernanceViolation } from "@/domains/shared/canonical-types";
import { platformBus } from "@/lib/shared/platform-bus";
import { persistViolation } from "@/services/governance/violation-persistence";

export type RuntimeFailureClass =
  | "transient"
  | "retriable"
  | "fatal"
  | "consistency_risk"
  | "data_duplication"
  | "ux_degradation";

interface LiveSubscription {
  id: string;
  channel: string;
  status: "active" | "stale" | "disconnected" | "error";
  lastHeartbeat: number;
  errorCount: number;
  createdAt: number;
}

interface RuntimeEvent {
  type: string;
  failureClass: RuntimeFailureClass;
  message: string;
  timestamp: number;
  resolved: boolean;
}

const subscriptionRegistry = new Map<string, LiveSubscription>();
const runtimeEvents: RuntimeEvent[] = [];
const runtimeViolations: GovernanceViolation[] = [];
const MAX_EVENTS = 500;
const STALE_THRESHOLD = 60_000;

export function registerSubscription(id: string, channel: string): void {
  subscriptionRegistry.set(id, {
    id,
    channel,
    status: "active",
    lastHeartbeat: Date.now(),
    errorCount: 0,
    createdAt: Date.now(),
  });
}

export function heartbeatSubscription(id: string): void {
  const sub = subscriptionRegistry.get(id);
  if (sub) {
    sub.lastHeartbeat = Date.now();
    sub.status = "active";
  }
}

export function reportSubscriptionError(id: string, error: string): void {
  const sub = subscriptionRegistry.get(id);
  if (sub) {
    sub.errorCount++;
    sub.status = sub.errorCount >= 3 ? "error" : "stale";
    recordEvent("subscription_error", classifyFailure(sub.errorCount), `${sub.channel}: ${error}`);
  }
}

export function unregisterSubscription(id: string): void {
  subscriptionRegistry.delete(id);
}

export function reportRuntimeFailure(
  type: string,
  failureClass: RuntimeFailureClass,
  message: string
): void {
  recordEvent(type, failureClass, message);
  platformBus.emit("ui-engine:report" as any, {
    engineId: "runtime-health",
    failure: { type, failureClass, message },
  });
}

function classifyFailure(errorCount: number): RuntimeFailureClass {
  if (errorCount >= 5) return "fatal";
  if (errorCount >= 3) return "consistency_risk";
  return "retriable";
}

function recordEvent(type: string, failureClass: RuntimeFailureClass, message: string): void {
  runtimeEvents.push({ type, failureClass, message, timestamp: Date.now(), resolved: false });
  if (runtimeEvents.length > MAX_EVENTS) {
    runtimeEvents.splice(0, runtimeEvents.length - MAX_EVENTS);
  }

  if (failureClass === "fatal" || failureClass === "consistency_risk") {
    const v: GovernanceViolation = {
      id: `runtime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "unclosed_flow",
      severity: failureClass === "fatal" ? "critical" : "error",
      source: `runtime:${type}`,
      target: "subscription",
      message: `Runtime failure [${failureClass}]: ${message}`,
      ownerDomain: "platform",
      vertical: "platform",
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      autoRemediated: false,
      metadata: { type, failureClass },
      engine: "runtime-health",
      code: `RUNTIME_${failureClass.toUpperCase()}`,
      dedupKey: `runtime:${type}:${failureClass}`,
      status: "new",
    };
    runtimeViolations.push(v);
    persistViolation(v);
  }
}

export function getRuntimeStats(): {
  activeSubscriptions: number;
  staleSubscriptions: number;
  errorSubscriptions: number;
  totalEvents: number;
  fatalEvents: number;
  unresolvedEvents: number;
} {
  const subs = Array.from(subscriptionRegistry.values());
  return {
    activeSubscriptions: subs.filter((s) => s.status === "active").length,
    staleSubscriptions: subs.filter((s) => s.status === "stale").length,
    errorSubscriptions: subs.filter((s) => s.status === "error").length,
    totalEvents: runtimeEvents.length,
    fatalEvents: runtimeEvents.filter((e) => e.failureClass === "fatal").length,
    unresolvedEvents: runtimeEvents.filter((e) => !e.resolved).length,
  };
}

export function getSubscriptions(): LiveSubscription[] {
  return Array.from(subscriptionRegistry.values());
}

export function getRuntimeEvents(): RuntimeEvent[] {
  return [...runtimeEvents];
}

export function getRuntimeViolations(): GovernanceViolation[] {
  return [...runtimeViolations];
}

export class RuntimeHealthEngine extends BaseEngine {
  constructor() {
    super({
      id: "runtime-health",
      name: "Runtime Health Engine",
      category: "governance",
      intervalMs: 15_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const now = Date.now();
    const actions: string[] = [];
    let findings = 0;

    for (const [id, sub] of subscriptionRegistry) {
      if (sub.status === "active" && now - sub.lastHeartbeat > STALE_THRESHOLD) {
        sub.status = "stale";
        findings++;
        actions.push(`STALE: ${sub.channel} (${Math.round((now - sub.lastHeartbeat) / 1000)}s)`);
      }
      if (sub.status === "error") {
        findings++;
        actions.push(`ERROR: ${sub.channel} (${sub.errorCount} errors)`);
      }
    }

    const recentFatal = runtimeEvents.filter(
      (e) => e.failureClass === "fatal" && !e.resolved && now - e.timestamp < this.intervalMs
    );
    findings += recentFatal.length;

    return {
      level: recentFatal.length > 0 ? "act" : findings > 0 ? "detect" : "observe",
      findings,
      actions: actions.slice(0, 5),
      duration: 0,
    };
  }
}
