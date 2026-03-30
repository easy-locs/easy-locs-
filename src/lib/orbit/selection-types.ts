/**
 * Orbit Selection — Canonical type definitions.
 */

export type SelectionMode = "idle" | "selecting";

export interface SelectionCapabilities {
  canDelete: boolean;
  canForward: boolean;
  canCopy: boolean;
  canStar: boolean;
}
