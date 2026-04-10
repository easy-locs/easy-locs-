import { resolveCallTarget as gatewayResolve } from "@/lib/orbit/orbit-data-gateway";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[CALL][${step}] ${phase}:`, payload ?? {});
};

export async function resolveCallTarget(rawTargetId: string, callerUserId: string): Promise<string> {
  trace("target.resolve", "input", { rawTargetId, callerUserId });
  const result = await gatewayResolve(rawTargetId, callerUserId);
  if (result) {
    trace("target.resolve", "output", { strategy: result.strategy, resolved: result.user_id });
    return result.user_id;
  }
  trace("target.resolve", "error", { reason: "all_strategies_exhausted", rawTargetId });
  return "";
}
