import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class GroceryNormalizerOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "grocery-normalizer",
      name: "Grocery Normalizer Engine",
      category: "normalizer",
      domain: "onboarding",
      intervalMs: 600_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runGroceryNormalizer } = await import("@/lib/engines/grocery-normalizer-engine");
    const result = await runGroceryNormalizer(50);
    const actions: string[] = [];
    if (result.normalized > 0) actions.push(`${result.normalized} grocery issues found`);

    return {
      level: result.normalized > 0 ? "detect" : "observe",
      findings: result.results.length,
      actions,
      duration: 0,
    };
  }
}
