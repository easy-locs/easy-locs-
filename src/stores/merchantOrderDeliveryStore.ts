/**
 * merchantOrderDeliveryStore — Merchant-only delivery state.
 * All DB access via mobility.repository.
 */
import { create } from "zustand";
import * as repo from "@/repositories/mobility.repository";

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
    const userId = await repo.getCurrentUserId();
    if (!userId) return;
    set({ loading: true });
    const merchant = await repo.fetchMerchantProfileByUserId(userId);
    if (!merchant) { set({ loading: false }); return; }
    const data = await repo.fetchMobilityJobs({
      merchantId: merchant.id,
      jobTypes: ["food_delivery"],
      orderBy: "created_at",
      ascending: false,
      limit: 50,
    });
    set({ jobs: data as unknown as MerchantDeliveryJob[], loading: false });
  },

  updateMerchantStatus: async (jobId, merchantStatus) => {
    await repo.invokeDispatchRide({ action: "merchant_update", job_id: jobId, merchant_status: merchantStatus });
    set(s => ({
      jobs: s.jobs.map(j => j.id === jobId ? { ...j, merchant_status: merchantStatus } : j),
    }));
  },
}));
