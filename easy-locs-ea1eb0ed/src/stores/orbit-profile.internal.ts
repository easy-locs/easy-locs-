/**
 * @internal orbit-profile.internal — Canonical Orbit profile store.
 * Manages orbit_profiles_v2 state for the current user.
 *
 * This module is INTERNAL. Only approved domain modules should import it.
 * External consumers must go through the public hooks (useOrbitIdentity, etc.).
 *
 * Domain hierarchy:
 *   orbit-profile.internal.ts → user identity / profile (this file)
 *   stores/orbit/             → messaging (threads, messages, composer, etc.)
 *   stores/orbit-engine/      → engine counters / alerts (unread, badges)
 */
import { create } from "zustand";
import { platformBus } from "@/lib/shared/platform-bus";
import type { AppRole, CanonicalOrbitProfile } from "@/domains/shared/canonical-types";
import { getOrbitProfile, updateOrbitProfileRole } from "@/repositories/orbit-profile.repository";
import { getCachedIdentityAsync, setCachedIdentity } from "@/lib/cache/identity-cache";

type OrbitProfileStore = {
  profile: CanonicalOrbitProfile | null;
  loading: boolean;
  loadProfile: (userId: string) => Promise<void>;
  updateRole: (role: AppRole) => Promise<void>;
  setProfile: (profile: CanonicalOrbitProfile | null) => void;
  clear: () => void;
};

export const useOrbitProfileStore = create<OrbitProfileStore>((set, get) => ({
  profile: null,
  loading: false,

  loadProfile: async (userId: string) => {
    set({ loading: true });

    const cached = await getCachedIdentityAsync(userId);
    if (cached) {
      const current = get().profile;
      if (current && current.id === userId) {
        set({
          profile: { ...current, displayName: cached.name, avatarUrl: cached.avatar ?? null },
          loading: false,
        });
      }
    }

    const profile = await getOrbitProfile(userId);

    if (!profile) {
      set({ loading: false });
      return;
    }

    const identityData = {
      name: profile.displayName ?? profile.orbitId,
      avatar: profile.avatarUrl ?? undefined,
      orbitId: profile.orbitId,
    };
    setCachedIdentity(userId, identityData);

    import("@/lib/redis/presence-service").then(({ updateHeartbeatIdentity }) => {
      updateHeartbeatIdentity(identityData);
    }).catch(() => {});

    set({ profile, loading: false });

    platformBus.emit("orbit:profile_loaded", { orbitId: profile.orbitId, userId: profile.id }, "orbit");
  },

  updateRole: async (role: AppRole) => {
    const profile = get().profile;
    if (!profile) return;

    const ok = await updateOrbitProfileRole(profile.id, role);
    if (!ok) return;

    set({ profile: { ...profile, role } });
  },

  setProfile: (profile) => set({ profile }),
  clear: () => set({ profile: null, loading: false }),
}));
