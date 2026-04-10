import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface Suggestion {
  id: string;
  type: "performance" | "security" | "ux" | "stability" | "data";
  description: string;
  priority: "low" | "medium" | "high";
  timestamp: number;
  applied: boolean;
}

export class CodeSuggestionEngine extends BaseEngine {
  private suggestions: Suggestion[] = [];

  constructor() {
    super({
      id: "ai-code-suggestion",
      name: "Code Suggestion Engine",
      category: "ai",
      intervalMs: 600_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const mem = (performance as any).memory;
    if (mem && mem.usedJSHeapSize > 150 * 1048576) {
      this.addSuggestion("performance", "Consider implementing virtual scrolling for large lists", "medium");
      findings.push("Memory usage suggests optimization opportunity");
    }

    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const largePayloads = resources.filter(r => r.transferSize > 500 * 1024);
    if (largePayloads.length > 3) {
      this.addSuggestion("performance", `${largePayloads.length} resources >500KB — consider compression or splitting`, "high");
      findings.push("Large resource payloads detected");
    }

    const domCount = document.querySelectorAll("*").length;
    if (domCount > 5000) {
      this.addSuggestion("performance", "DOM exceeds 5000 nodes — implement virtualization or lazy sections", "medium");
    }

    return { level: findings.length > 0 ? "propose" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  private addSuggestion(type: Suggestion["type"], description: string, priority: Suggestion["priority"]): void {
    const exists = this.suggestions.some(s => s.description === description && !s.applied);
    if (!exists) {
      this.suggestions.push({
        id: crypto.randomUUID(),
        type,
        description,
        priority,
        timestamp: Date.now(),
        applied: false,
      });
      if (this.suggestions.length > 100) this.suggestions = this.suggestions.slice(-100);
    }
  }

  getSuggestions(): Suggestion[] {
    return this.suggestions.filter(s => !s.applied);
  }
}
