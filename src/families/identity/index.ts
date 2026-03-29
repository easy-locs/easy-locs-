/**
 * FAMILY: IDENTITY — Canonical identity resolution for the entire app.
 * Single source of truth. All modules must use this family for user/entity display.
 *
 * Re-exports canonical resolvers and adds app-wide identity utilities.
 */

// ── Re-export canonical identity resolver ──
export {
  resolveCanonicalDisplayIdentity,
  type CanonicalDisplayIdentity,
} from "@/lib/orbit/canonical-helpers";

// ── Re-export orbit identity hook (reactive) ──
export {
  useOrbitIdentity,
  getOrbitIdentity,
  requireOrbitIdentity,
  type OrbitIdentity,
} from "@/hooks/useOrbitIdentity";

/**
 * Resolve a canonical display identity from any entity shape.
 * This is the ONLY allowed entry point for identity display.
 *
 * Usage:
 *   const identity = resolveIdentity({ display_name: "John", email: "john@ex.com" });
 *   // → { displayName: "John", subtitle: "john@ex.com", initials: "J", avatarUrl: null }
 */
export { resolveCanonicalDisplayIdentity as resolveIdentity } from "@/lib/orbit/canonical-helpers";
