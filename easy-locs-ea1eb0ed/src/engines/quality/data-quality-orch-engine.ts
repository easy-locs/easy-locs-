import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface QualityResultItem {
  shopId: string;
  shopName: string;
  overallScore: number;
  grade: string;
}

export class DataQualityOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "data-quality",
      name: "Data Quality Engine",
      category: "quality",
      domain: "taxonomy",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runDataQualityEngine } = await import("@/lib/engines/data-quality-engine");
    const result = await runDataQualityEngine(100);
    const lowQuality = result.results.filter((r: QualityResultItem) => r.grade === "D" || r.grade === "F").length;
    const actions: string[] = [];
    if (lowQuality > 0) actions.push(`${lowQuality} entities with D/F quality grade`);

    return {
      level: lowQuality > 0 ? "detect" : "observe",
      findings: result.scanned,
      actions,
      duration: 0,
    };
  }
}
