import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

interface SuspiciousEvent {
  type: string;
  detail: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  timestamp: number;
}

export class FraudWatchEngine extends BaseEngine {
  private events: SuspiciousEvent[] = [];
  private transferHistory: Array<{ amount: number; ts: number }> = [];

  constructor() {
    super({
      id: "wallet-fraud-watch",
      name: "Fraud Watch Engine",
      category: "wallet",
      intervalMs: 15_000,
    });
    this.installListeners();
  }

  private installListeners(): void {
    platformBus.on("wallet:transfer_sent" as any, (payload: any) => {
      if (payload?.amount) {
        this.transferHistory.push({ amount: payload.amount, ts: Date.now() });
        if (this.transferHistory.length > 200) this.transferHistory = this.transferHistory.slice(-200);
      }
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const last5min = this.transferHistory.filter(t => t.ts > Date.now() - 300_000);
    if (last5min.length > 10) {
      findings.push(`Rapid transfers: ${last5min.length} in 5min`);
      this.events.push({ type: "rapid-transfer", detail: `${last5min.length} transfers`, riskLevel: "high", timestamp: Date.now() });
    }

    const totalAmount = last5min.reduce((s, t) => s + t.amount, 0);
    if (totalAmount > 10_000) {
      findings.push(`High transfer volume: ${totalAmount.toFixed(2)} in 5min`);
      this.events.push({ type: "high-volume", detail: `${totalAmount} total`, riskLevel: "critical", timestamp: Date.now() });
    }

    const uniqueAmounts = new Set(last5min.map(t => t.amount));
    if (last5min.length > 3 && uniqueAmounts.size === 1) {
      findings.push(`Repeated identical transfers: ${last5min.length}x ${[...uniqueAmounts][0]}`);
      this.events.push({ type: "pattern-repeat", detail: "identical amounts", riskLevel: "medium", timestamp: Date.now() });
    }

    if (this.events.length > 500) this.events = this.events.slice(-500);

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getSuspiciousEvents() {
    return [...this.events];
  }
}
