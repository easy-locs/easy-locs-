import { create } from "zustand";
import { usePropertyManagementStore } from "@/stores/propertyManagementStore";
import { useNotificationsStore } from "@/stores/notificationsStore";

type PropertyManagementActionsStore = {
  markLeaseLate: (leaseId: string) => void;
  markPaymentLate: (paymentId: string) => void;
};

export const usePropertyManagementActionsStore = create<PropertyManagementActionsStore>(() => ({
  markLeaseLate: (leaseId) => {
    usePropertyManagementStore.setState((state) => ({
      leases: state.leases.map((lease) =>
        lease.id === leaseId
          ? { ...lease, status: "late" as const, updatedAt: new Date().toISOString() }
          : lease
      ),
    }));
  },

  markPaymentLate: (paymentId) => {
    const payment = usePropertyManagementStore
      .getState()
      .rentPayments.find((p) => p.id === paymentId);

    usePropertyManagementStore.setState((state) => ({
      rentPayments: state.rentPayments.map((p) =>
        p.id === paymentId
          ? { ...p, status: "late" as const, updatedAt: new Date().toISOString() }
          : p
      ),
    }));

    if (payment) {
      void useNotificationsStore.getState().push({
        orbitId: payment.ownerOrbitId,
        type: "rent",
        title: "Rent payment late",
        body: `Payment ${payment.id} is marked late`,
        metadata: { paymentId: payment.id },
      });
    }
  },
}));
