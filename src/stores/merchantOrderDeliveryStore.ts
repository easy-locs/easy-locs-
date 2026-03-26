/**
 * merchantOrderDeliveryStore — Merchant-only delivery state.
 * Actor: MERCHANT only.
 * Merchants can: accept orders, set preparing/ready, view assigned rider.
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface MerchantDeliveryJob {
  id: string;
  job_type: string;
  status: string;
  merchant_status: string | null;
  rider_user_id: string | null;
  customer_user_id: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  current_price: number | null;
  currency: string;
  order_id: string | null;
  prep_time_minutes: number | null;
  ready_at: string | null;
  created_at: string | null;
}

interface MerchantOrderDeliveryState {
  jobs: MerchantDeliveryJob[];
  loading: boolean;

  hydrateMyJobs: () => Promise<void>;
  updateMerchantStatus: (jobId: string, merchantStatus: string) => Promise<void>;
}

export const useMerchantOrderDeliveryStore = create<MerchantOrderDeliveryState>((set) => ({
  jobs: [],
  loading: false,

  hydrateMyJobs: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    set({ loading: true });

    // Get merchant profile
    const { data: merchant } = await supabase
      .from("merchant_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!merchant) {
      set({ loading: false });
      return;
    }

    const { data } = await supabase
      .from("mobility_jobs")
      .select("*")
      .eq("merchant_id", merchant.id)
      .in("job_type", ["food_delivery"])
      .order("created_at", { ascending: false })
      .limit(50);

    set({ jobs: (data ?? []) as unknown as MerchantDeliveryJob[], loading: false });
  },

  updateMerchantStatus: async (jobId, merchantStatus) => {
    const { data, error } = await supabase.functions.invoke("dispatch-ride", {
      body: { action: "merchant_update", job_id: jobId, merchant_status: merchantStatus },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    set(s => ({
      jobs: s.jobs.map(j => j.id === jobId ? { ...j, merchant_status: merchantStatus } : j),
    }));
  },
}));
