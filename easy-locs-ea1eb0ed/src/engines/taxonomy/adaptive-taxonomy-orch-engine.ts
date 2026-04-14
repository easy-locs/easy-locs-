import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class AdaptiveTaxonomyOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "adaptive-taxonomy",
      name: "Adaptive Taxonomy Engine",
      category: "taxonomy",
      domain: "taxonomy",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runAdaptiveTaxonomyEngine } = await import("@/lib/engines/adaptive-taxonomy-engine");
    const result = await runAdaptiveTaxonomyEngine(100);
    const actions: string[] = [];
    if (result.mapped > 0) actions.push(`${result.mapped} taxonomy suggestions`);

    return {
      level: result.mapped > 0 ? "propose" : "observe",
      findings: result.results.length,
      actions,
      duration: 0,
    };
  }
}
