import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

interface LedgerEvent {
  type: "credit" | "debit";
  amount: number;
  timestamp: number;
  source: string;
}

export class LedgerIntegrityEngine extends BaseEngine {
  private events: LedgerEvent[] = [];

  constructor() {
    super({
      id: "wallet-ledger-integrity",
      name: "Ledger Integrity Engine",
      category: "wallet",
      intervalMs: 60_000,
    });
    this.installListeners();
  }

  private installListeners(): void {
    platformBus.on("wallet:balance_updated" as any, (payload: any) => {
      if (payload?.amount !== undefined) {
        this.events.push({
          type: payload.amount >= 0 ? "credit" : "debit",
          amount: Math.abs(payload.amount),
          timestamp: Date.now(),
          source: payload.source || "unknown",
        });
        if (this.events.length > 500) this.events = this.events.slice(-500);
      }
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const recent = this.events.filter(e => e.timestamp > Date.now() - this.intervalMs);
    const totalCredit = recent.filter(e => e.type === "credit").reduce((s, e) => s + e.amount, 0);
    const totalDebit = recent.filter(e => e.type === "debit").reduce((s, e) => s + e.amount, 0);

    if (totalDebit > 50_000) {
      findings.push(`High debit volume: ${totalDebit.toFixed(2)} in last cycle`);
    }
    if (recent.length > 50) {
      findings.push(`Transaction burst: ${recent.length} events in last cycle`);
    }

    const negativeEvents = recent.filter(e => e.amount < 0);
    if (negativeEvents.length > 0) {
      findings.push(`${negativeEvents.length} negative amount events — data integrity issue`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
