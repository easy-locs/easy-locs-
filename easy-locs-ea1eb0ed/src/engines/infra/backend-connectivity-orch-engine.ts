import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { adaptiveRetry } from "@/lib/infrastructure/adaptive-retry";

export class BackendConnectivityOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "backend-reconnect",
      name: "Backend Connectivity Engine",
      category: "infrastructure",
      domain: "infrastructure",
      intervalMs: 45_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runBackendConnectivityCheck } = await import("@/lib/engines/backend-connectivity-engine");
    const result = await adaptiveRetry.executeWithRetry(
      "backend-connectivity-check",
      () => runBackendConnectivityCheck(5000),
      { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 5000 },
    );
    const actions: string[] = [];
    if (result.down > 0) actions.push(`${result.down} service(s) DOWN`);
    if (result.degraded > 0) actions.push(`${result.degraded} service(s) degraded`);

    return {
      level: result.down > 0 ? "act" : result.degraded > 0 ? "detect" : "observe",
      findings: result.results.length,
      actions,
      duration: 0,
    };
  }
}
