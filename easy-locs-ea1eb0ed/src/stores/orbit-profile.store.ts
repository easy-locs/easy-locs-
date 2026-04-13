/**
 * orbit-profile.store — Canonical Orbit profile store.
 * Manages orbit_profiles_v2 state for the current user.
 *
 * Domain hierarchy:
 *   orbit-profile.store.ts  → user identity / profile (this file)
 *   stores/orbit/           → messaging (threads, messages, composer, etc.)
 *   stores/orbit-engine/    → engine counters / alerts (unread, badges)
 */
import { create } from "zustand";
import { platformBus } from "@/lib/shared/platform-bus";
import type { AppRole, CanonicalOrbitProfile } from "@/domains/shared/canonical-types";
import { getOrbitProfile, updateOrbitProfileRole } from "@/repositories/orbit-profile.repository";

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

    const profile = await getOrbitProfile(userId);

    if (!profile) {
      set({ loading: false });
      return;
    }

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
