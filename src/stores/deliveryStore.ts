import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm as haversine } from "@/lib/geo/distance";
import { useOrbitStore } from "@/stores/orbitStore";

type DeliveryJobStatus =
  | "searching"
  | "assigned"
  | "accepted"
  | "rejected"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled"
  | "pending";

type DeliveryJob = {
  id: string;
  seller_id?: string;
  driver_id?: string | null;
  org_id?: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  delivery_fee: number | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  [key: string]: unknown;
};

type DeliveryStoreState = {
  jobs: DeliveryJob[];
  loading: boolean;

  hydrateMyJobs: () => Promise<void>;
  createJob: (input: {
    pickupLat: number;
    pickupLng: number;
    dropLat: number;
    dropLng: number;
    price: number;
    orgId?: string;
  }) => Promise<void>;
  autoDispatch: (job: DeliveryJob) => Promise<void>;
  acceptJob: (jobId: string) => Promise<void>;
  rejectJob: (jobId: string) => Promise<void>;
  updateJobStatus: (jobId: string, status: DeliveryJobStatus) => Promise<void>;
};

export const useDeliveryStore = create<DeliveryStoreState>((set, get) => ({
  jobs: [],
  loading: false,

  hydrateMyJobs: async () => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return;

    set({ loading: true });

    const { data, error } = await (supabase as any)
      .from("delivery_jobs")
      .select("*")
      .or(`seller_id.eq.${userId},driver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("hydrateMyJobs error", error);
      set({ loading: false });
      return;
    }

    set({ jobs: (data ?? []) as DeliveryJob[], loading: false });
  },

  createJob: async (input) => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return;

    const now = new Date().toISOString();

    const { data, error } = await (supabase as any)
      .from("delivery_jobs")
      .insert({
        seller_id: userId,
        org_id: input.orgId ?? userId,
        pickup_lat: input.pickupLat,
        pickup_lng: input.pickupLng,
        pickup_address: "Pickup",
        dropoff_lat: input.dropLat,
        dropoff_lng: input.dropLng,
        dropoff_address: "Dropoff",
        delivery_fee: input.price,
        status: "pending",
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error) {
      console.error("createJob error", error);
      return;
    }

    set((s) => ({ jobs: [data as DeliveryJob, ...s.jobs] }));
    await get().autoDispatch(data as DeliveryJob);
  },

  autoDispatch: async (job) => {
    const pickupLat = job.pickup_lat;
    const pickupLng = job.pickup_lng;
    if (!pickupLat || !pickupLng) return;

    // Try drivers_live first for orbit-based drivers
    const { data: liveDrivers } = await (supabase as any)
      .from("drivers_live")
      .select("*")
      .eq("online", true);

    // Also try driver_profiles
    const { data: profileDrivers } = await (supabase as any)
      .from("driver_profiles")
      .select("*")
      .eq("is_online", true)
      .eq("is_available", true);

    const allDrivers = [
      ...(liveDrivers ?? []).map((d: any) => ({
        id: d.orbit_id,
        lat: d.lat,
        lng: d.lng,
        source: "live" as const,
      })),
      ...(profileDrivers ?? []).map((d: any) => ({
        id: d.user_id,
        lat: d.current_lat,
        lng: d.current_lng,
        source: "profile" as const,
      })),
    ].filter((d) => d.lat != null && d.lng != null);

    if (allDrivers.length === 0) return;

    const ranked = allDrivers
      .map((d) => ({
        ...d,
        distance: haversine(pickupLat, pickupLng, d.lat!, d.lng!),
      }))
      .sort((a, b) => a.distance - b.distance);

    const best = ranked[0];
    if (!best) return;

    const { data: updated, error } = await (supabase as any)
      .from("delivery_jobs")
      .update({
        driver_id: best.id,
        status: "assigned",
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("*")
      .single();

    if (error) {
      console.error("autoDispatch assign error", error);
      return;
    }

    set((s) => ({
      jobs: s.jobs.map((x) => (x.id === job.id ? (updated as DeliveryJob) : x)),
    }));
  },

  acceptJob: async (jobId) => {
    const { data, error } = await (supabase as any)
      .from("delivery_jobs")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select("*")
      .single();

    if (error) {
      console.error("acceptJob error", error);
      return;
    }

    set((s) => ({
      jobs: s.jobs.map((x) => (x.id === jobId ? (data as DeliveryJob) : x)),
    }));
  },

  rejectJob: async (jobId) => {
    const { data, error } = await (supabase as any)
      .from("delivery_jobs")
      .update({
        driver_id: null,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select("*")
      .single();

    if (error) {
      console.error("rejectJob error", error);
      return;
    }

    set((s) => ({
      jobs: s.jobs.map((x) => (x.id === jobId ? (data as DeliveryJob) : x)),
    }));

    // Re-dispatch
    await get().autoDispatch(data as DeliveryJob);
  },

  updateJobStatus: async (jobId, status) => {
    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "picked_up") patch.picked_up_at = new Date().toISOString();
    if (status === "delivered") patch.delivered_at = new Date().toISOString();
    if (status === "cancelled") patch.cancelled_at = new Date().toISOString();

    const { data, error } = await (supabase as any)
      .from("delivery_jobs")
      .update(patch)
      .eq("id", jobId)
      .select("*")
      .single();

    if (error) {
      console.error("updateJobStatus error", error);
      return;
    }

    set((s) => ({
      jobs: s.jobs.map((x) => (x.id === jobId ? (data as DeliveryJob) : x)),
    }));
  },
}));
