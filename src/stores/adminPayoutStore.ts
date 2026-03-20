import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { PayoutRequest } from "@/lib/types/finance";
import {
  serverApprovePayoutRequest,
  serverRejectPayoutRequest,
} from "@/lib/server-actions/adminPayouts";

type AdminPayoutStore = {
  items: PayoutRequest[];
  loading: boolean;
  hydrate: () => Promise<void>;
  approve: (payoutRequestId: string) => Promise<void>;
  reject: (payoutRequestId: string, reason?: string) => Promise<void>;
};

export const useAdminPayoutStore = create<AdminPayoutStore>((set) => ({
  items: [],
  loading: false,

  hydrate: async () => {
    set({ loading: true });

    const { data, error } = await supabase
      .from("payout_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to hydrate payout requests:", error);
      set({ loading: false });
      return;
    }

    set({ items: (data ?? []) as PayoutRequest[], loading: false });
  },

  approve: async (payoutRequestId) => {
    set({ loading: true });
    try {
      const result = await serverApprovePayoutRequest({ payoutRequestId });
      if (result?.payoutRequest) {
        set((state) => ({
          items: state.items.map((x) =>
            x.id === payoutRequestId ? result.payoutRequest : x
          ),
          loading: false,
        }));
        return;
      }
    } catch (e) {
      console.error("Payout approve failed:", e);
    }
    set({ loading: false });
  },

  reject: async (payoutRequestId, reason) => {
    set({ loading: true });
    try {
      const result = await serverRejectPayoutRequest({ payoutRequestId, reason });
      if (result?.payoutRequest) {
        set((state) => ({
          items: state.items.map((x) =>
            x.id === payoutRequestId ? result.payoutRequest : x
          ),
          loading: false,
        }));
        return;
      }
    } catch (e) {
      console.error("Payout reject failed:", e);
    }
    set({ loading: false });
  },
}));
