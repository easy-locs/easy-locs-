import { create } from "zustand";
import type { OrbitProfile, AppRole } from "@/lib/types/app";
import { platformBus } from "@/app/events/platform-bus";

type OrbitStore = {
  profile: OrbitProfile | null;
  loading: boolean;

  loadOrbitProfile: (input: {
    userId: string;
    orbitId: string;
    role?: AppRole;
    deviceId?: string;
  }) => Promise<void>;

  setProfile: (profile: OrbitProfile | null) => void;
  clear: () => void;
};

export const useOrbitStore = create<OrbitStore>((set) => ({
  profile: null,
  loading: false,

  loadOrbitProfile: async ({ userId, orbitId, role = "guest", deviceId }) => {
    set({ loading: true });

    const profile: OrbitProfile = {
      userId,
      orbitId,
      role,
      deviceId: deviceId ?? `device_${Math.random().toString(36).slice(2, 10)}`,
      verificationLevel: 1,
      permissions: {
        camera: false,
        microphone: false,
        geolocation: false,
        contacts: false,
        notifications: false,
      },
      serviceLinks: {
        walletLinked: false,
        bookingEnabled: true,
        deliveryEnabled: true,
        propertyEnabled: true,
        messagingEnabled: true,
      },
    };

    set({ profile, loading: false });

    platformBus.emit({
      type: "orbit.profile.loaded",
      payload: { orbitId, userId },
    });
  },

  setProfile: (profile) => set({ profile }),
  clear: () => set({ profile: null, loading: false }),
}));
