import { BaseEngine, type EngineTickResult } from "../core/base-engine";

type ErrorCategory = "network" | "auth" | "state" | "render" | "data" | "unknown";

interface ClassifiedError {
  category: ErrorCategory;
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  autoFixable: boolean;
}

export class ErrorClassifier extends BaseEngine {
  private classified: Map<string, ClassifiedError> = new Map();
  private rawErrors: Array<{ message: string; timestamp: number }> = [];

  constructor() {
    super({
      id: "sh-error-classifier",
      name: "Error Classifier",
      category: "self-healing",
      intervalMs: 30_000,
    });
    this.installGlobalHandler();
  }

  private installGlobalHandler(): void {
    window.addEventListener("error", (e) => {
      this.rawErrors.push({ message: e.message || "unknown", timestamp: Date.now() });
      if (this.rawErrors.length > 500) this.rawErrors = this.rawErrors.slice(-500);
    });
    window.addEventListener("unhandledrejection", (e) => {
      const msg = e.reason?.message || String(e.reason) || "unhandled rejection";
      this.rawErrors.push({ message: msg, timestamp: Date.now() });
      if (this.rawErrors.length > 500) this.rawErrors = this.rawErrors.slice(-500);
    });
  }

  private categorize(message: string): ErrorCategory {
    const lower = message.toLowerCase();
    if (lower.includes("fetch") || lower.includes("network") || lower.includes("timeout") || lower.includes("cors") || lower.includes("aborted")) return "network";
    if (lower.includes("auth") || lower.includes("token") || lower.includes("session") || lower.includes("401") || lower.includes("403")) return "auth";
    if (lower.includes("render") || lower.includes("react") || lower.includes("component") || lower.includes("hook")) return "render";
    if (lower.includes("null") || lower.includes("undefined") || lower.includes("typeerror") || lower.includes("json")) return "data";
    if (lower.includes("state") || lower.includes("store") || lower.includes("zustand")) return "state";
    return "unknown";
  }

  async tick(): Promise<EngineTickResult> {
    const recent = this.rawErrors.filter(e => e.timestamp > Date.now() - this.intervalMs);
    const findings: string[] = [];

    for (const err of recent) {
      const key = err.message.substring(0, 100);
      const category = this.categorize(err.message);
      const existing = this.classified.get(key);
      if (existing) {
        existing.count++;
        existing.lastSeen = err.timestamp;
      } else {
        this.classified.set(key, {
          category,
          message: key,
          count: 1,
          firstSeen: err.timestamp,
          lastSeen: err.timestamp,
          autoFixable: category === "network" || category === "state",
        });
      }
    }

    for (const [key, err] of this.classified) {
      if (err.count >= 5 && err.lastSeen > Date.now() - 60_000) {
        findings.push(`[${err.category}] Recurring (${err.count}x): ${key}`);
      }
    }

    if (this.classified.size > 500) {
      const sorted = [...this.classified.entries()].sort((a, b) => b[1].lastSeen - a[1].lastSeen);
      this.classified = new Map(sorted.slice(0, 300));
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getClassified(): ClassifiedError[] {
    return [...this.classified.values()];
  }
}
