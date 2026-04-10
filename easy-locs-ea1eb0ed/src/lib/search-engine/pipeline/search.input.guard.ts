/**
 * search.input.guard — Validates search state before pipeline execution.
 */
import type { SearchState } from "../search-types";

export interface GuardResult {
  valid: boolean;
  reason?: string;
}

export function guardSearchInput(state: SearchState): GuardResult {
  if (state.radiusKm <= 0) return { valid: false, reason: "radius must be positive" };
  if (state.limit <= 0 || state.limit > 200) return { valid: false, reason: "limit out of range (1-200)" };
  if (state.page < 1) return { valid: false, reason: "page must be >= 1" };
  return { valid: true };
}
