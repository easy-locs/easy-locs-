import { create } from "zustand";
import { serverCreateRentPayment } from "@/lib/server-actions/rent";
import { usePropertyManagementStore } from "@/stores/propertyManagementStore";

type SecureRentActionsStore = {
  loading: boolean;
  createRentPaymentServer: (input: {
    leaseId: string;
    dueDate: string;
    reference?: string;
  }) => Promise<void>;
};

export const useSecureRentActionsStore = create<SecureRentActionsStore>((set) => ({
  loading: false,

  createRentPaymentServer: async (input) => {
    set({ loading: true });
    try {
      const result = await serverCreateRentPayment(input);
      if (result?.payment) {
        usePropertyManagementStore.setState((state) => ({
          rentPayments: [result.payment, ...state.rentPayments.filter((p: { id: string }) => p.id !== result.payment.id)],
        }));
      }
    } finally {
      set({ loading: false });
    }
  },
}));
