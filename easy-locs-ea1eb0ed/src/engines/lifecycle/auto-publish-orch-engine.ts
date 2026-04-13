import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class AutoPublishOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "auto-publish",
      name: "Auto Publish Engine",
      category: "lifecycle",
      domain: "visibility",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runAutoPublish } = await import("@/lib/engines/auto-publish-engine");
    const result = await runAutoPublish(50);
    const actions: string[] = [];
    if (result.published > 0) actions.push(`Published ${result.published} listings`);
    if (result.blocked > 0) actions.push(`Blocked ${result.blocked} listings`);

    return {
      level: actions.length > 0 ? "act" : "observe",
      findings: result.results.length,
      actions,
      duration: 0,
    };
  }
}
