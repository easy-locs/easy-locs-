import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface CompletenessResultItem {
  shopId: string;
  shopName: string;
  completeness: number;
  missingFields: string[];
  grade: string;
}

export class DataCompletenessOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "data-completeness",
      name: "Data Completeness Engine",
      category: "quality",
      domain: "onboarding",
      intervalMs: 600_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runDataCompletenessEngine } = await import("@/lib/engines/data-completeness-engine");
    const result = await runDataCompletenessEngine(100);
    const incomplete = result.results.filter((r: CompletenessResultItem) => r.completeness < 60).length;
    const actions: string[] = [];
    if (incomplete > 0) actions.push(`${incomplete} entities below 60% completeness`);

    return {
      level: incomplete > 0 ? "detect" : "observe",
      findings: result.scanned,
      actions,
      duration: 0,
    };
  }
}
