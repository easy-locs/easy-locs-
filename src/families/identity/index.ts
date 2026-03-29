/**
 * FAMILY: IDENTITY — Canonical identity resolution for the entire app.
 * Single source of truth. All modules must use this family for user/entity display.
 *
 * Re-exports canonical resolvers and adds app-wide identity utilities.
 */
import { supabase } from "@/integrations/supabase/client";

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

// ── Re-export canonical identity chain ──
export {
  getCanonicalIdentity,
  invalidateIdentityCache,
  peekIdentity,
  type CanonicalIdentity,
  type IdentityMode,
} from "@/lib/canonical-identity";

/**
 * Canonical getCurrentUserId — SINGLE implementation for the entire app.
 * Returns the authenticated user ID or throws if not authenticated.
 * All modules MUST use this instead of inline auth.getUser() calls.
 */
export async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

/**
 * Non-throwing variant — returns null if not authenticated.
 */
export async function getCurrentUserIdOrNull(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Resolve a canonical display identity from any entity shape.
 * This is the ONLY allowed entry point for identity display.
 */
export { resolveCanonicalDisplayIdentity as resolveIdentity } from "@/lib/orbit/canonical-helpers";
