/**
 * Conflict Resolver — priority-based deduplication and conflict removal.
 */
import type { ArbitrationDecision } from "./types";
import { DecisionPriority } from "./types";

export function resolveConflicts(decisions: ArbitrationDecision[]): ArbitrationDecision[] {
  const sorted = [...decisions].sort((a, b) => a.priority - b.priority);
  const resolved: ArbitrationDecision[] = [];
  const blockedModuleActions = new Set<string>();

  for (const d of sorted) {
    const key = `${d.module}:${d.action}`;

    if (d.priority === DecisionPriority.SAFETY) {
      if (d.action === "reject_promise" || d.action === "block_promise") {
        blockedModuleActions.add("demand:apply_surge");
        blockedModuleActions.add("rider:incentivize_zone");
      }
    }

    if (blockedModuleActions.has(key)) continue;

    const existing = resolved.find(r =>
      r.module === d.module && r.action === d.action &&
      (r as any).zoneKey === (d as any).zoneKey &&
      (r as any).merchantId === (d as any).merchantId &&
      (r as any).category === (d as any).category
    );
    if (existing) continue;

    resolved.push(d);
  }

  return resolved;
}
