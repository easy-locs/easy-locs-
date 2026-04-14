import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface TrustResultItem {
  shopId: string;
  shopName: string;
  trustScore: number;
  signals: string[];
}

export class DataTrustOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "data-trust-scan",
      name: "Data Trust Engine",
      category: "quality",
      domain: "taxonomy",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runDataTrustScan } = await import("@/lib/engines/data-trust-engine");
    const result = await runDataTrustScan(100);
    const lowTrust = result.results.filter((r: TrustResultItem) => r.trustScore < 40).length;
    const actions: string[] = [];
    if (lowTrust > 0) actions.push(`${lowTrust} entities with trust < 40`);

    return {
      level: lowTrust > 0 ? "detect" : "observe",
      findings: result.scanned,
      actions,
      duration: 0,
    };
  }
}
