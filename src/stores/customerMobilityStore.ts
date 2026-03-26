/**
 * customerMobilityStore — Customer-only mobility state.
 * Reads/writes: mobility_jobs (via dispatch-ride edge function)
 * Actor: CUSTOMER only.
 * Customers can: create jobs, track, cancel.
 * Customers CANNOT: accept offers, go online, see rider controls.
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface MobilityJob {
  id: string;
  job_type: string;
  service_level: string;
  customer_user_id: string;
  rider_user_id: string | null;
  rider_profile_id: string | null;
  merchant_id: string | null;
  order_id: string | null;
  status: string;
  pickup_label: string | null;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_label: string | null;
  dropoff_address: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  quoted_price: number | null;
  current_price: number | null;
  surge_multiplier: number | null;
  currency: string;
  payment_status: string | null;
  merchant_status: string | null;
  confirmation_code: string | null;
  created_at: string | null;
  updated_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

interface CustomerMobilityState {
  jobs: MobilityJob[];
  activeJob: MobilityJob | null;
  loading: boolean;
  error: string | null;

  hydrateMyJobs: () => Promise<void>;
  createJob: (input: {
    jobType: string;
    serviceLevel: string;
    bookingMode?: string;
    scheduledFor?: string;
    pickupLabel?: string;
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropoffLabel?: string;
    dropoffAddress: string;
    dropoffLat: number;
    dropoffLng: number;
    merchantId?: string;
    orderId?: string;
    parcelReference?: string;
    seatsRequested?: number;
    packageSize?: string;
    quotedPrice?: number;
    currency?: string;
    notes?: string;
  }) => Promise<MobilityJob>;
  cancelJob: (jobId: string, reason?: string) => Promise<void>;
  setActiveJob: (job: MobilityJob | null) => void;
  refreshJob: (jobId: string) => Promise<void>;
}

export const useCustomerMobilityStore = create<CustomerMobilityState>((set, get) => ({
  jobs: [],
  activeJob: null,
  loading: false,
  error: null,

  hydrateMyJobs: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from("mobility_jobs")
      .select("*")
      .eq("customer_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    const jobs = (data ?? []) as unknown as MobilityJob[];
    const activeJob = jobs.find(j => !["completed", "cancelled", "failed_no_rider", "expired"].includes(j.status)) ?? null;
    set({ jobs, activeJob, loading: false });
  },

  createJob: async (input) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    const { data, error } = await supabase.functions.invoke("dispatch-ride", {
      body: {
        action: "create_job",
        job_type: input.jobType,
        service_level: input.serviceLevel,
        pickup_label: input.pickupLabel,
        pickup_address: input.pickupAddress,
        pickup_lat: input.pickupLat,
        pickup_lng: input.pickupLng,
        dropoff_label: input.dropoffLabel,
        dropoff_address: input.dropoffAddress,
        dropoff_lat: input.dropoffLat,
        dropoff_lng: input.dropoffLng,
        merchant_id: input.merchantId,
        order_id: input.orderId,
        parcel_reference: input.parcelReference,
        seats_requested: input.seatsRequested,
        package_size: input.packageSize,
        quoted_price: input.quotedPrice,
        currency: input.currency ?? "AED",
        notes: input.notes,
      },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    const job = data.job as MobilityJob;
    set(s => ({ jobs: [job, ...s.jobs], activeJob: job }));
    return job;
  },

  cancelJob: async (jobId, reason) => {
    const { data, error } = await supabase.functions.invoke("dispatch-ride", {
      body: { action: "cancel_job", job_id: jobId, reason },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    set(s => ({
      jobs: s.jobs.map(j => j.id === jobId ? { ...j, status: "cancelled" } : j),
      activeJob: s.activeJob?.id === jobId ? null : s.activeJob,
    }));
  },

  setActiveJob: (job) => set({ activeJob: job }),

  refreshJob: async (jobId) => {
    const { data } = await supabase
      .from("mobility_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (data) {
      const job = data as unknown as MobilityJob;
      set(s => ({
        jobs: s.jobs.map(j => j.id === jobId ? job : j),
        activeJob: s.activeJob?.id === jobId ? job : s.activeJob,
      }));
    }
  },
}));
