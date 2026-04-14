import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class FullStackLinkageOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "full-stack-linkage",
      name: "Full Stack Linkage Engine",
      category: "infrastructure",
      domain: "infrastructure",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runFullStackLinkageCheck } = await import("@/lib/engines/full-stack-linkage-engine");
    const result = await runFullStackLinkageCheck(100);
    const actions: string[] = [];
    if (result.broken > 0) actions.push(`${result.broken} broken linkages`);
    if (result.missing > 0) actions.push(`${result.missing} missing linkages`);

    return {
      level: result.broken > 0 ? "detect" : "observe",
      findings: result.results.length,
      actions,
      duration: 0,
    };
  }
}
