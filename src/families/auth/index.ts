/**
 * FAMILY: AUTH — Canonical authentication state for the entire app.
 * Single source of truth. All auth checks must use this family.
 */

// ── Re-export auth context ──
export { useAuth } from "@/contexts/AuthContext";

// ── Re-export auth repository ──
export { getAuthUser } from "@/repositories/auth-utils.repository";

import { useCallback } from "react";
import { toast } from "sonner";
import { getAuthUser } from "@/repositories/auth-utils.repository";

/**
 * Hook that returns a stable resolveAuthUserId callback.
 * Use this instead of creating inline resolvers in every component.
 */
export function useResolveAuthUserId(t?: (k: string) => string) {
  return useCallback(async (): Promise<string | null> => {
    const { user, error } = await getAuthUser();
    if (error || !user?.id) {
      toast.error(t?.("orbit.session_expired") || "Session expired");
      return null;
    }
    return user.id;
  }, [t]);
}
