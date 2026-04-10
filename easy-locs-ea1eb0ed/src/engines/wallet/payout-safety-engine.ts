import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

export class PayoutSafetyEngine extends BaseEngine {
  private payoutQueue: Array<{ amount: number; ts: number; status: string }> = [];

  constructor() {
    super({
      id: "wallet-payout-safety",
      name: "Payout Safety Engine",
      category: "wallet",
      intervalMs: 60_000,
    });
    platformBus.on("wallet:payout_requested" as any, (p: any) => {
      this.payoutQueue.push({ amount: p?.amount || 0, ts: Date.now(), status: "pending" });
      if (this.payoutQueue.length > 200) this.payoutQueue = this.payoutQueue.slice(-200);
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const pending = this.payoutQueue.filter(p => p.status === "pending" && Date.now() - p.ts > 300_000);
    if (pending.length > 0) {
      findings.push(`${pending.length} payouts pending >5min`);
    }

    const totalPending = this.payoutQueue.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
    if (totalPending > 50_000) {
      findings.push(`High pending payout volume: ${totalPending.toFixed(2)}`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
