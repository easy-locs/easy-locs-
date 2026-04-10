import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

export class ProviderMatchingEngine extends BaseEngine {
  private matchRequests: Array<{ type: string; ts: number; matched: boolean }> = [];

  constructor() {
    super({
      id: "radar-provider-matching",
      name: "Provider Matching Engine",
      category: "radar",
      intervalMs: 30_000,
    });
    platformBus.on("radar:match_requested" as any, (p: any) => {
      this.matchRequests.push({ type: p?.serviceType || "unknown", ts: Date.now(), matched: false });
    });
    platformBus.on("radar:match_found" as any, (p: any) => {
      const recent = this.matchRequests.filter(r => !r.matched).pop();
      if (recent) recent.matched = true;
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const recent = this.matchRequests.filter(r => r.ts > Date.now() - 300_000);
    const unmatched = recent.filter(r => !r.matched && Date.now() - r.ts > 60_000);

    if (unmatched.length > 0) {
      findings.push(`${unmatched.length} provider matches pending >60s`);
    }

    const matchRate = recent.length > 0 ? recent.filter(r => r.matched).length / recent.length : 1;
    if (recent.length > 5 && matchRate < 0.5) {
      findings.push(`Low match rate: ${Math.round(matchRate * 100)}%`);
    }

    if (this.matchRequests.length > 500) this.matchRequests = this.matchRequests.slice(-500);

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
