import type { CostBudget, TokenUsage } from "./types.js";

const MODEL_COSTS_PER_1K: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o": { prompt: 0.0025, completion: 0.01 },
  "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "gpt-4-turbo": { prompt: 0.01, completion: 0.03 },
  "gpt-4": { prompt: 0.03, completion: 0.06 },
  "o3-mini": { prompt: 0.0011, completion: 0.0044 },
};

export class CostControls {
  private budget: CostBudget;
  private alertCallbacks: Array<(message: string) => void> = [];

  constructor(budget: CostBudget) {
    this.budget = { ...budget };
  }

  onAlert(callback: (message: string) => void): void {
    this.alertCallbacks.push(callback);
  }

  private emitAlert(message: string): void {
    console.warn(`[cost-controls] ${message}`);
    for (const cb of this.alertCallbacks) {
      try {
        cb(message);
      } catch {
        // swallow callback errors
      }
    }
  }

  checkBudget(): { allowed: boolean; reason?: string } {
    this.maybeResetCounters();

    if (this.budget.currentDailyUsd >= this.budget.dailyLimitUsd) {
      return {
        allowed: false,
        reason: `Daily budget exhausted: $${this.budget.currentDailyUsd.toFixed(4)} / $${this.budget.dailyLimitUsd}`,
      };
    }

    if (this.budget.currentMonthlyUsd >= this.budget.monthlyLimitUsd) {
      return {
        allowed: false,
        reason: `Monthly budget exhausted: $${this.budget.currentMonthlyUsd.toFixed(4)} / $${this.budget.monthlyLimitUsd}`,
      };
    }

    return { allowed: true };
  }

  recordUsage(usage: TokenUsage): void {
    this.maybeResetCounters();

    this.budget.currentDailyUsd += usage.estimatedCostUsd;
    this.budget.currentMonthlyUsd += usage.estimatedCostUsd;

    const dailyPct = (this.budget.currentDailyUsd / this.budget.dailyLimitUsd) * 100;
    const monthlyPct = (this.budget.currentMonthlyUsd / this.budget.monthlyLimitUsd) * 100;

    if (dailyPct >= 90) {
      this.emitAlert(
        `Daily budget at ${dailyPct.toFixed(1)}%: $${this.budget.currentDailyUsd.toFixed(4)} / $${this.budget.dailyLimitUsd}`
      );
    }

    if (monthlyPct >= 80) {
      this.emitAlert(
        `Monthly budget at ${monthlyPct.toFixed(1)}%: $${this.budget.currentMonthlyUsd.toFixed(4)} / $${this.budget.monthlyLimitUsd}`
      );
    }
  }

  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    const costs = MODEL_COSTS_PER_1K[model] ?? MODEL_COSTS_PER_1K["gpt-4o"]!;
    return (promptTokens / 1000) * costs.prompt + (completionTokens / 1000) * costs.completion;
  }

  buildTokenUsage(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): TokenUsage {
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model,
      estimatedCostUsd: this.estimateCost(model, promptTokens, completionTokens),
    };
  }

  getStatus(): CostBudget {
    this.maybeResetCounters();
    return { ...this.budget };
  }

  private maybeResetCounters(): void {
    const today = new Date().toISOString().split("T")[0];
    const month = today.slice(0, 7);

    if (this.budget.lastResetDaily !== today) {
      this.budget.currentDailyUsd = 0;
      this.budget.lastResetDaily = today;
    }

    if (this.budget.lastResetMonthly !== month) {
      this.budget.currentMonthlyUsd = 0;
      this.budget.lastResetMonthly = month;
    }
  }
}
