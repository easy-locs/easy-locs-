import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class CategoryMappingOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "category-mapping-sync",
      name: "Category Mapping Engine",
      category: "taxonomy",
      domain: "taxonomy",
      intervalMs: 600_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runCategoryMappingSync } = await import("@/lib/engines/category-mapping-engine");
    const result = await runCategoryMappingSync(200);
    const actions: string[] = [];
    if (result.remapped > 0) actions.push(`${result.remapped} categories remapped`);

    return {
      level: result.remapped > 0 ? "act" : "observe",
      findings: result.results.length,
      actions,
      duration: 0,
    };
  }
}
