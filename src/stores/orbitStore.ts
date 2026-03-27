import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import type { AppRole } from "@/lib/types/domain";

// V2 OrbitProfile aligned with orbit_profiles_v2 table
export interface OrbitProfileV2 {
  id: string; // auth user id
  orbitId: string;
  email: string | null;
  role: AppRole;
  displayName: string | null;
  avatarUrl: string | null;
  deviceId: string | null;
  verificationLevel: number;
  permissions: {
    camera: boolean;
    microphone: boolean;
    geolocation: boolean;
    contacts: boolean;
    notifications: boolean;
  };
  serviceLinks: {
    walletLinked: boolean;
    bookingEnabled: boolean;
    deliveryEnabled: boolean;
    propertyEnabled: boolean;
    messagingEnabled: boolean;
  };
}

type OrbitStore = {
  profile: OrbitProfileV2 | null;
  loading: boolean;
  loadProfile: (userId: string) => Promise<void>;
  updateRole: (role: AppRole) => Promise<void>;
  setProfile: (profile: OrbitProfileV2 | null) => void;
  clear: () => void;
};

// Use untyped client for V2 tables not yet in auto-generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const useOrbitStore = create<OrbitStore>((set, get) => ({
  profile: null,
  loading: false,

  loadProfile: async (userId: string) => {
    set({ loading: true });

    const { data, error } = await db
      .from("orbit_profiles_v2")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load orbit profile:", error);
      set({ loading: false });
      return;
    }

    if (!data) {
      set({ loading: false });
      return;
    }

    const profile: OrbitProfileV2 = {
      id: data.id,
      orbitId: data.orbit_id,
      email: (data as any).email ?? null,
      role: (data.role as AppRole) || "buyer",
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      deviceId: data.device_id,
      verificationLevel: data.verification_level ?? 1,
      permissions: data.permissions ?? {
        camera: false,
        microphone: false,
        geolocation: false,
        contacts: false,
        notifications: false,
      },
      serviceLinks: data.service_links ?? {
        walletLinked: false,
        bookingEnabled: true,
        deliveryEnabled: true,
        propertyEnabled: true,
        messagingEnabled: true,
      },
    };

    set({ profile, loading: false });

    platformBus.emit("orbit:profile_loaded", { orbitId: profile.orbitId, userId: profile.id }, "orbit");
  },

  updateRole: async (role: AppRole) => {
    const profile = get().profile;
    if (!profile) return;

    const { error } = await db
      .from("orbit_profiles_v2")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (error) {
      console.error("Failed to update role:", error);
      return;
    }

    set({
      profile: { ...profile, role },
    });
  },

  setProfile: (profile) => set({ profile }),
  clear: () => set({ profile: null, loading: false }),
}));
