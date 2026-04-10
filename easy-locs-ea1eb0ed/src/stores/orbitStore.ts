/**
 * orbitStore — Orbit profile state (orbit_profiles_v2).
 *
 * SSOT alignment:
 *   - All DB access via orbit-profile.repository (no direct supabase calls here).
 *   - Messaging / conversations: see domains/orbit/stores/orbit.store.ts
 *
 * NOTE: Both this store and domains/orbit/stores/orbit.store.ts export `useOrbitStore`.
 * Rename tracking: this store will be renamed useOrbitProfileStore in Wave 3.
 * Alias below is kept for current consumers during transition.
 */
import { create } from "zustand";
import { platformBus } from "@/lib/shared/platform-bus";
import type { AppRole } from "@/domains/shared/canonical-types";
import type { CanonicalOrbitProfile } from "@/domains/shared/canonical-types";
import { getOrbitProfile, updateOrbitProfileRole } from "@/repositories/orbit-profile.repository";

/** @deprecated Use CanonicalOrbitProfile from @/domains/shared/canonical-types */
export type OrbitProfileV2 = CanonicalOrbitProfile;

type OrbitStore = {
  profile: OrbitProfileV2 | null;
  loading: boolean;
  loadProfile: (userId: string) => Promise<void>;
  updateRole: (role: AppRole) => Promise<void>;
  setProfile: (profile: OrbitProfileV2 | null) => void;
  clear: () => void;
};

export const useOrbitStore = create<OrbitStore>((set, get) => ({
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

/**
 * Canonical disambiguated export for the PROFILE store.
 * Prefer this name over useOrbitStore to avoid collision with the messaging store.
 * useOrbitStore is kept as a deprecated alias for backward compat during transition.
 */
export const useOrbitProfileStore = useOrbitStore;
