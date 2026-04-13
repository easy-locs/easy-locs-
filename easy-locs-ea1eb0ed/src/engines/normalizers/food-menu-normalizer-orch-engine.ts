import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class FoodMenuNormalizerOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "food-menu-normalizer",
      name: "Food Menu Normalizer Engine",
      category: "normalizer",
      domain: "onboarding",
      intervalMs: 600_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runFoodMenuNormalizer } = await import("@/lib/engines/food-menu-normalizer-engine");
    const result = await runFoodMenuNormalizer();
    const actions: string[] = [];
    if (result.normalized > 0) actions.push(`${result.normalized} menu issues found`);

    return {
      level: result.normalized > 0 ? "detect" : "observe",
      findings: result.results.length,
      actions,
      duration: 0,
    };
  }
}
