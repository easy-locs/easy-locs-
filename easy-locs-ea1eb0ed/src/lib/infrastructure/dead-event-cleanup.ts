import { platformBus } from "@/lib/shared/platform-bus";
import { detectDeadEvents } from "@/lib/runtime/flow-completeness-validator";

export interface DeadEventRecord {
  eventType: string;
  detectedAt: number;
  cleanedAt: number | null;
  occurrences: number;
}

export interface SentinelAlert {
  eventType: string;
  alertType: "detected" | "recurring" | "cleaned";
  message: string;
  timestamp: number;
}

const CLEANUP_INTERVAL_MS = 120_000;
const SENTINEL_LOG_PREFIX = "[DeadEventSentinel]";
const MAX_ALERTS = 300;
const RECURRENCE_THRESHOLD = 3;

class DeadEventCleanupService {
  private deadEventRegistry = new Map<string, DeadEventRecord>();
  private sentinelAlerts: SentinelAlert[] = [];
  private _cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private _installed = false;
  private cleanupCount = 0;

  install(): () => void {
    if (this._installed) return () => {};
    this._installed = true;

    this.runScan();

    this._cleanupInterval = setInterval(() => {
      this.runScan();
    }, CLEANUP_INTERVAL_MS);

    return () => {
      this._installed = false;
      if (this._cleanupInterval) {
        clearInterval(this._cleanupInterval);
        this._cleanupInterval = null;
      }
    };
  }

  private runScan(): void {
    const deadEvents = detectDeadEvents();
    const now = Date.now();
    const currentDead = new Set(deadEvents);

    for (const eventType of deadEvents) {
      const existing = this.deadEventRegistry.get(eventType);
      if (existing) {
        existing.occurrences++;
        if (existing.occurrences >= RECURRENCE_THRESHOLD && existing.occurrences % RECURRENCE_THRESHOLD === 0) {
          this.emitSentinelAlert(eventType, "recurring",
            `${SENTINEL_LOG_PREFIX} Recurring dead event "${eventType}" detected ${existing.occurrences} times — investigate emitter`);
        }
      } else {
        this.deadEventRegistry.set(eventType, {
          eventType,
          detectedAt: now,
          cleanedAt: null,
          occurrences: 1,
        });
        this.emitSentinelAlert(eventType, "detected",
          `${SENTINEL_LOG_PREFIX} New dead event detected: "${eventType}" — no listeners registered`);
      }
    }

    for (const [eventType, record] of this.deadEventRegistry) {
      if (!currentDead.has(eventType) && !record.cleanedAt) {
        record.cleanedAt = now;
        this.cleanupCount++;
        this.emitSentinelAlert(eventType, "cleaned",
          `${SENTINEL_LOG_PREFIX} Dead event "${eventType}" resolved — listener registered or emitter removed`);
      }
    }

    if (this.deadEventRegistry.size > 500) {
      const entries = Array.from(this.deadEventRegistry.entries());
      const cleaned = entries.filter(([, r]) => r.cleanedAt !== null);
      cleaned.sort((a, b) => (a[1].cleanedAt ?? 0) - (b[1].cleanedAt ?? 0));
      const toRemove = cleaned.slice(0, cleaned.length - 200);
      for (const [key] of toRemove) {
        this.deadEventRegistry.delete(key);
      }
    }
  }

  private emitSentinelAlert(eventType: string, alertType: SentinelAlert["alertType"], message: string): void {
    const alert: SentinelAlert = {
      eventType,
      alertType,
      message,
      timestamp: Date.now(),
    };

    this.sentinelAlerts.push(alert);
    if (this.sentinelAlerts.length > MAX_ALERTS) {
      this.sentinelAlerts.shift();
    }

    platformBus.emit("system:dead_event_sentinel", {
      eventType,
      alertType,
      message,
    }, "system");

    if (typeof console !== "undefined") {
      const logFn = alertType === "recurring" ? console.warn : console.info;
      logFn(message);
    }
  }

  getReport(): {
    totalTracked: number;
    activeDeadEvents: number;
    cleanedEvents: number;
    totalCleanups: number;
    recentAlerts: SentinelAlert[];
    topRecurring: Array<{ eventType: string; occurrences: number }>;
  } {
    const records = Array.from(this.deadEventRegistry.values());
    const active = records.filter((r) => r.cleanedAt === null);
    const cleaned = records.filter((r) => r.cleanedAt !== null);

    const topRecurring = records
      .filter((r) => r.occurrences >= RECURRENCE_THRESHOLD)
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10)
      .map((r) => ({ eventType: r.eventType, occurrences: r.occurrences }));

    return {
      totalTracked: records.length,
      activeDeadEvents: active.length,
      cleanedEvents: cleaned.length,
      totalCleanups: this.cleanupCount,
      recentAlerts: this.sentinelAlerts.slice(-15),
      topRecurring,
    };
  }

  reset(): void {
    this.deadEventRegistry.clear();
    this.sentinelAlerts = [];
    this.cleanupCount = 0;
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
    this._installed = false;
  }
}

export const deadEventCleanup = new DeadEventCleanupService();
