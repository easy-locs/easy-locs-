/**
 * useOrbitIdentity — Canonical hook for accessing current user's orbit identity.
 * Replaces direct `useOrbitStore.getState().profile` calls in stores.
 * 
 * For Zustand stores (non-React context), use `getOrbitIdentity()` instead.
 */
import { useOrbitStore } from "@/stores/orbitStore";
import type { OrbitProfileV2 } from "@/stores/orbitStore";

export interface OrbitIdentity {
  userId: string;
  orbitId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
}

/**
 * Imperative getter for use inside Zustand stores (outside React tree).
 * Returns null if no profile is loaded.
 */
export function getOrbitIdentity(): OrbitIdentity | null {
  const profile = useOrbitStore.getState().profile;
  if (!profile) return null;
  return mapProfile(profile);
}

/**
 * Returns orbitId or throws — for use in store actions that require auth.
 */
export function requireOrbitIdentity(): OrbitIdentity {
  const identity = getOrbitIdentity();
  if (!identity) throw new Error("No authenticated orbit profile");
  return identity;
}

/**
 * React hook — subscribes reactively to orbit profile changes.
 * Use in components/pages instead of direct orbitStore access.
 */
export function useOrbitIdentity(): OrbitIdentity | null {
  const profile = useOrbitStore((s) => s.profile);
  if (!profile) return null;
  return mapProfile(profile);
}

function mapProfile(p: OrbitProfileV2): OrbitIdentity {
  return {
    userId: p.id,
    orbitId: p.orbitId,
    email: p.email,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    role: p.role,
  };
}
