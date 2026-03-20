import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { haversine } from "@/lib/geo/haversine";

type DeliveryJob = {
  id: string;
  status: string;
  [key: string]: unknown;
};

type DeliveryStoreState = {
  jobs: DeliveryJob[];

  createJob: (input: {
    pickupLat: number;
    pickupLng: number;
    dropLat: number;
    dropLng: number;
    price: number;
  }) => Promise<void>;

  autoDispatch: (job: DeliveryJob) => Promise<void>;
};

export const useDeliveryStore = create<DeliveryStoreState>((set, get) => ({
  jobs: [],

  createJob: async (input) => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return;

    const job: DeliveryJob = {
      id: `job_${Math.random().toString(36).slice(2, 10)}`,
      seller_id: userId,
      pickup_lat: input.pickupLat,
      pickup_lng: input.pickupLng,
      dropoff_lat: input.dropLat,
      dropoff_lng: input.dropLng,
      delivery_fee: input.price,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    await (supabase as any).from("delivery_jobs").insert(job);
    set((s) => ({ jobs: [job, ...s.jobs] }));

    // auto dispatch closest driver
    await get().autoDispatch(job);
  },

  autoDispatch: async (job) => {
    const pickupLat = job.pickup_lat as number;
    const pickupLng = job.pickup_lng as number;
    if (!pickupLat || !pickupLng) return;

    const { data: drivers } = await (supabase as any)
      .from("driver_profiles")
      .select("*")
      .eq("is_online", true)
      .eq("is_available", true);

    if (!drivers || drivers.length === 0) return;

    const ranked = drivers
      .filter((d: any) => d.current_lat != null && d.current_lng != null)
      .map((d: any) => ({
        ...d,
        distance: haversine(pickupLat, pickupLng, d.current_lat, d.current_lng),
      }))
      .sort((a: any, b: any) => a.distance - b.distance);

    const best = ranked[0];
    if (!best) return;

    await (supabase as any)
      .from("delivery_jobs")
      .update({
        driver_id: best.user_id,
        status: "assigned",
        assigned_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  },
}));
