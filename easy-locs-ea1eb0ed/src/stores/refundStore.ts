import { create } from "zustand";
import type { RefundRequest } from "@/lib/types/finance";
import {
  serverProcessBookingRefund,
  serverRequestBookingRefund,
} from "@/lib/server-actions/refunds";

type RefundStore = {
  items: RefundRequest[];
  loading: boolean;
  requestBookingRefund: (bookingId: string, reason?: string) => Promise<void>;
  processBookingRefund: (refundRequestId: string) => Promise<void>;
};

export const useRefundStore = create<RefundStore>((set) => ({
  items: [],
  loading: false,

  requestBookingRefund: async (bookingId, reason) => {
    set({ loading: true });
    try {
      const data = await serverRequestBookingRefund({ bookingId, reason });
      if (data?.refundRequest) {
        set((state) => ({
          items: [data.refundRequest, ...state.items],
        }));
      }
    } finally {
      set({ loading: false });
    }
  },

  processBookingRefund: async (refundRequestId) => {
    set({ loading: true });
    try {
      const data = await serverProcessBookingRefund({ refundRequestId });
      if (data?.refundRequest) {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === refundRequestId ? data.refundRequest : item
          ),
        }));
      }
    } finally {
      set({ loading: false });
    }
  },
}));
