/**
 * Summary Builder — human-readable arbitration summary.
 */
import type { ETAProjection } from "@/lib/radar/eta-projection-engine";
import type { ArbitrationDecision } from "./types";
import { DecisionPriority } from "./types";

export function buildSummary(
  decisions: ArbitrationDecision[],
  etas: ETAProjection,
  surge: number,
  safetyBlock: boolean
): string {
  const parts: string[] = [];

  if (safetyBlock) parts.push("⚠️ SAFETY BLOCK ACTIVE");
  if (surge > 1.05) parts.push(`Surge: ${surge.toFixed(2)}x`);

  const etaParts = (["food", "grocery", "taxi", "parcel"] as const)
    .filter(c => etas[c] != null)
    .map(c => `${c}: ${etas[c]}min`);
  if (etaParts.length) parts.push(`ETAs: ${etaParts.join(", ")}`);

  parts.push(`${decisions.length} decisions issued`);

  const critical = decisions.filter(d => d.priority <= DecisionPriority.OPERATIONAL_TRUTH).length;
  if (critical > 0) parts.push(`${critical} critical`);

  return parts.join(" | ");
}
