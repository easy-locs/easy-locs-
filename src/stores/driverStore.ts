import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useGeoStore } from "@/stores/geoStore";
import { useOrbitStore } from "@/stores/orbitStore";

type DriverLive = {
  user_id: string;
  is_online: boolean;
  is_available: boolean;
  current_lat: number | null;
  current_lng: number | null;
  service_mode: string | null;
  [key: string]: unknown;
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
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return;

    set({ online: value });

    await (supabase as any).from("driver_profiles").upsert({
      user_id: userId,
      is_online: value,
      updated_at: new Date().toISOString(),
    });
  },

  updatePosition: async () => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return;

    const geo = useGeoStore.getState().currentPosition;
    if (!geo.lat && !geo.lng) return;

    await (supabase as any).from("driver_profiles").upsert({
      user_id: userId,
      current_lat: geo.lat,
      current_lng: geo.lng,
      updated_at: new Date().toISOString(),
    });
  },

  hydrateDrivers: async () => {
    const { data } = await (supabase as any)
      .from("driver_profiles")
      .select("*")
      .eq("is_online", true)
      .eq("is_available", true);

    set({ drivers: (data ?? []) as DriverLive[] });
  },
}));
