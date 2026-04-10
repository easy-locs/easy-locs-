import { create } from "zustand";
import type { PayoutRequest } from "@/lib/types/finance";
import { serverCreatePayoutRequest } from "@/lib/server-actions/payouts";

type PayoutStore = {
  items: PayoutRequest[];
  loading: boolean;
  createPayoutRequest: (input: {
    amount: number;
    currency: string;
    destinationType?: string;
    destinationRef?: string;
    note?: string;
  }) => Promise<void>;
};

export const usePayoutStore = create<PayoutStore>((set) => ({
  items: [],
  loading: false,

  createPayoutRequest: async (input) => {
    set({ loading: true });
    try {
      const data = await serverCreatePayoutRequest(input);
      if (data?.payoutRequest) {
        set((state) => ({
          items: [data.payoutRequest, ...state.items],
        }));
      }
    } finally {
      set({ loading: false });
    }
  },
}));
