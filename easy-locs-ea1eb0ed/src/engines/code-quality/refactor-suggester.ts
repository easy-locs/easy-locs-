import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface Suggestion {
  type: string;
  description: string;
  priority: "low" | "medium" | "high";
  timestamp: number;
}

export class RefactorSuggester extends BaseEngine {
  private suggestions: Suggestion[] = [];

  constructor() {
    super({
      id: "cq-refactor",
      name: "Refactor Suggester",
      category: "code-quality",
      intervalMs: 600_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const memInfo = (performance as any).memory;
    if (memInfo) {
      const usedMB = memInfo.usedJSHeapSize / 1048576;
      const limitMB = memInfo.jsHeapSizeLimit / 1048576;
      const ratio = usedMB / limitMB;
      if (ratio > 0.7) {
        findings.push(`Memory pressure: ${Math.round(usedMB)}MB / ${Math.round(limitMB)}MB (${Math.round(ratio * 100)}%)`);
        this.suggestions.push({
          type: "memory",
          description: "Consider lazy-loading heavy modules or reducing cached data",
          priority: ratio > 0.85 ? "high" : "medium",
          timestamp: Date.now(),
        });
      }
    }

    const storageSize = new Blob(
      Object.entries(localStorage).map(([k, v]) => k + v)
    ).size;
    if (storageSize > 4 * 1024 * 1024) {
      findings.push(`localStorage nearing limit: ${(storageSize / 1048576).toFixed(1)}MB`);
      this.suggestions.push({
        type: "storage",
        description: "Prune old localStorage entries to prevent quota errors",
        priority: "high",
        timestamp: Date.now(),
      });
    }

    if (this.suggestions.length > 200) this.suggestions = this.suggestions.slice(-200);

    return { level: findings.length > 0 ? "propose" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getSuggestions() {
    return [...this.suggestions];
  }
}
