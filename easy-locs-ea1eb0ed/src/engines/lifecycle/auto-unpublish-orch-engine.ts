import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class AutoUnpublishOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "auto-unpublish",
      name: "Auto Unpublish Engine",
      category: "lifecycle",
      domain: "visibility",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runAutoUnpublish } = await import("@/lib/engines/auto-unpublish-engine");
    const result = await runAutoUnpublish(50);
    const actions: string[] = [];
    if (result.unpublished > 0) actions.push(`Unpublished ${result.unpublished} listings`);

    return {
      level: actions.length > 0 ? "act" : "observe",
      findings: result.results.length,
      actions,
      duration: 0,
    };
  }
}
