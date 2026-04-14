import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class PublishGateServiceOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "publish-gate-service",
      name: "Publish Gate Service Engine",
      category: "gate",
      domain: "visibility",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runServicePublishGate } = await import("@/lib/engines/publish-gate-service-engine");
    const result = await runServicePublishGate(50);
    const actions: string[] = [];
    if (result.passed > 0) actions.push(`${result.passed} service listings passed gate`);
    if (result.failed > 0) actions.push(`${result.failed} service listings failed gate`);

    return {
      level: result.failed > 0 ? "detect" : "observe",
      findings: result.results.length,
      actions,
      duration: 0,
    };
  }
}
