import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class PublishGateGroceryOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "publish-gate-grocery",
      name: "Publish Gate Grocery Engine",
      category: "gate",
      domain: "visibility",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runGroceryPublishGate } = await import("@/lib/engines/publish-gate-grocery-engine");
    const result = await runGroceryPublishGate(50);
    const actions: string[] = [];
    if (result.passed > 0) actions.push(`${result.passed} grocery listings passed gate`);
    if (result.failed > 0) actions.push(`${result.failed} grocery listings failed gate`);

    return {
      level: result.failed > 0 ? "detect" : "observe",
      findings: result.results.length,
      actions,
      duration: 0,
    };
  }
}
