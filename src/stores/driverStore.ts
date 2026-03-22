import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useGeoStore } from "@/lib/geo/geo-store";
import { useOrbitStore } from "@/stores/orbitStore";

type DriverLive = {
  orbit_id: string;
  online: boolean;
  lat: number | null;
  lng: number | null;
  updated_at: string;
};

type DriverStoreState = {
  drivers: DriverLive[];
  online: boolean;

  setOnline: (value: boolean) => Promise<void>;
  updatePosition: () => Promise<void>;
  hydrateDrivers: () => Promise<void>;
};

export const useDriverStore = create<DriverStoreState>((set) => ({
  drivers: [],
  online: false,

  setOnline: async (value) => {
    const orbit = useOrbitStore.getState().profile;
    if (!orbit) return;

    set({ online: value });

    await (supabase as any).from("drivers_live").upsert({
      orbit_id: orbit.orbitId,
      online: value,
      updated_at: new Date().toISOString(),
    });
  },

  updatePosition: async () => {
    const orbit = useOrbitStore.getState().profile;
    const pt = useGeoStore.getState().point;
    if (!orbit) return;
    if (!pt?.lat && !pt?.lng) return;

    await (supabase as any).from("drivers_live").upsert({
      orbit_id: orbit.orbitId,
      lat: pt?.lat,
      lng: pt?.lng,
      updated_at: new Date().toISOString(),
    });
  },

  hydrateDrivers: async () => {
    const { data } = await (supabase as any)
      .from("drivers_live")
      .select("*")
      .eq("online", true);

    set({ drivers: (data ?? []) as DriverLive[] });
  },
}));
