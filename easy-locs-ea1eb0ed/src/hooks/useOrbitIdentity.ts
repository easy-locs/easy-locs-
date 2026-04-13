/**
 * useOrbitIdentity — Public API for orbit profile access.
 * Replaces direct internal store imports in UI code.
 *
 * React: useOrbitIdentity(), useOrbitLoading()
 * Imperative: getOrbitIdentity(), requireOrbitIdentity()
 * Actions: loadOrbitProfile(), clearOrbitProfile()
 */
import { useMemo } from "react";
import { useOrbitProfileStore } from "@/stores/orbit-profile.internal";
import type { CanonicalOrbitProfile } from "@/domains/shared/canonical-types";

export interface OrbitIdentity {
  userId: string;
  orbitId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
}

export function getOrbitIdentity(): OrbitIdentity | null {
  const profile = useOrbitProfileStore.getState().profile;
  if (!profile) return null;
  return mapProfile(profile);
}

export function requireOrbitIdentity(): OrbitIdentity {
  const identity = getOrbitIdentity();
  if (!identity) throw new Error("No authenticated orbit profile");
  return identity;
}

export function useOrbitIdentity(): OrbitIdentity | null {
  const profile = useOrbitProfileStore((s) => s.profile);
  return useMemo(
    () => (profile ? mapProfile(profile) : null),
    [profile?.id, profile?.orbitId, profile?.email, profile?.displayName, profile?.avatarUrl, profile?.role],
  );
}

export function useOrbitLoading(): boolean {
  return useOrbitProfileStore((s) => s.loading);
}

export async function loadOrbitProfile(userId: string): Promise<void> {
  return useOrbitProfileStore.getState().loadProfile(userId);
}

export function clearOrbitProfile(): void {
  useOrbitProfileStore.getState().clear();
}

export function getOrbitProfile(): CanonicalOrbitProfile | null {
  return useOrbitProfileStore.getState().profile;
}

export function patchOrbitProfile(patch: Partial<CanonicalOrbitProfile>): void {
  const current = useOrbitProfileStore.getState().profile;
  if (!current) return;
  useOrbitProfileStore.setState({ profile: { ...current, ...patch } });
}

function mapProfile(p: CanonicalOrbitProfile): OrbitIdentity {
  return {
    userId: p.id,
    orbitId: p.orbitId,
    email: p.email,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    role: p.role,
  };
}
