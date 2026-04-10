import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class ReconciliationEngine extends BaseEngine {
  private lastBalance: number | null = null;
  private discrepancies: Array<{ expected: number; actual: number; timestamp: number }> = [];

  constructor() {
    super({
      id: "wallet-reconciliation",
      name: "Reconciliation Engine",
      category: "wallet",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const balanceEl = document.querySelector("[data-wallet-balance]");
    if (balanceEl) {
      const displayedBalance = parseFloat(balanceEl.getAttribute("data-wallet-balance") || "0");

      if (this.lastBalance !== null && Math.abs(displayedBalance - this.lastBalance) > 10_000) {
        findings.push(`Large balance jump: ${this.lastBalance} → ${displayedBalance}`);
        this.discrepancies.push({
          expected: this.lastBalance,
          actual: displayedBalance,
          timestamp: Date.now(),
        });
      }

      if (displayedBalance < 0) {
        findings.push(`Negative balance displayed: ${displayedBalance}`);
      }

      this.lastBalance = displayedBalance;
    }

    if (this.discrepancies.length > 100) this.discrepancies = this.discrepancies.slice(-100);

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
