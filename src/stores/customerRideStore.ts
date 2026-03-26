/**
 * customerRideStore — Customer-only ride state.
 * Customers can: create rides, track, cancel.
 * Customers CANNOT: accept rides, go online, see rider controls.
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerJob {
  id: string;
  customer_user_id: string;
  rider_user_id: string | null;
  status: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  fare_amount: number | null;
  delivery_fee: number | null;
  currency: string | null;
  surge_multiplier: number | null;
  payment_status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface CustomerRideState {
  jobs: CustomerJob[];
  activeJob: CustomerJob | null;
  loading: boolean;
  error: string | null;

  hydrateMyJobs: () => Promise<void>;
  createRide: (input: {
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropoffAddress: string;
    dropoffLat: number;
    dropoffLng: number;
    fareAmount?: number;
    currency?: string;
    notes?: string;
    scheduledAt?: string;
  }) => Promise<CustomerJob>;
  cancelRide: (jobId: string, reason?: string) => Promise<void>;
  setActiveJob: (job: CustomerJob | null) => void;
}

export const useCustomerRideStore = create<CustomerRideState>((set, get) => ({
  jobs: [],
  activeJob: null,
  loading: false,
  error: null,

  hydrateMyJobs: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    set({ loading: true, error: null });

    const { data, error } = await (supabase as any)
      .from("delivery_jobs")
      .select("*")
      .eq("customer_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    const jobs = (data ?? []) as CustomerJob[];
    const activeJob = jobs.find(j => !["completed", "cancelled"].includes(j.status)) ?? null;
    set({ jobs, activeJob, loading: false });
  },

  createRide: async (input) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    const { data, error } = await supabase.functions.invoke("dispatch-ride", {
      body: {
        action: "create_ride",
        pickup_address: input.pickupAddress,
        pickup_lat: input.pickupLat,
        pickup_lng: input.pickupLng,
        dropoff_address: input.dropoffAddress,
        dropoff_lat: input.dropoffLat,
        dropoff_lng: input.dropoffLng,
        fare_amount: input.fareAmount,
        currency: input.currency ?? "AED",
        notes: input.notes,
        scheduled_at: input.scheduledAt,
      },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    const job = data.job as CustomerJob;
    set(s => ({ jobs: [job, ...s.jobs], activeJob: job }));
    return job;
  },

  cancelRide: async (jobId, reason) => {
    const { data, error } = await supabase.functions.invoke("dispatch-ride", {
      body: { action: "cancel_ride", job_id: jobId, reason },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    set(s => ({
      jobs: s.jobs.map(j => j.id === jobId ? { ...j, status: "cancelled" } : j),
      activeJob: s.activeJob?.id === jobId ? null : s.activeJob,
    }));
  },

  setActiveJob: (job) => set({ activeJob: job }),
}));
