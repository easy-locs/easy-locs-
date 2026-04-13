import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class PublishGateFoodOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "publish-gate-food",
      name: "Publish Gate Food Engine",
      category: "gate",
      domain: "visibility",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runFoodPublishGate } = await import("@/lib/engines/publish-gate-food-engine");
    const result = await runFoodPublishGate(50);
    const actions: string[] = [];
    if (result.passed > 0) actions.push(`${result.passed} food listings passed gate`);
    if (result.failed > 0) actions.push(`${result.failed} food listings failed gate`);

    return {
      level: result.failed > 0 ? "detect" : "observe",
      findings: result.results.length,
      actions,
      duration: 0,
    };
  }
}
