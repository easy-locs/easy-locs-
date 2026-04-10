import { create } from "zustand";
import { platformBus } from "@/lib/shared/platform-bus";
import type {
  PropertyUnitManagement,
  LeaseRecord,
  RentPaymentRecord,
} from "@/lib/types/property-management";
import { useListingStore } from "@/stores/listingStore";
import { useWalletStore } from "@/stores/walletStore";
import { useOrbitThreadStore } from "@/stores/orbit/thread.store";
import { sendSystemMessage } from "@/lib/chat/messageService";

type CreateUnitInput = {
  listingId: string;
  ownerOrbitId: string;
  unitLabel: string;
  propertyType: "apartment" | "villa" | "studio" | "room" | "shop" | "office";
};

type CreateLeaseInput = {
  listingId: string;
  unitId: string;
  ownerOrbitId: string;
  tenantOrbitId: string;
  startDate: string;
  endDate: string;
  dueDay: number;
  notes?: string;
};

type CreateRentPaymentInput = {
  leaseId: string;
  dueDate: string;
  reference?: string;
};

type PropertyManagementStore = {
  units: PropertyUnitManagement[];
  leases: LeaseRecord[];
  rentPayments: RentPaymentRecord[];

  createUnit: (input: CreateUnitInput) => PropertyUnitManagement | null;
  createLease: (input: CreateLeaseInput) => Promise<LeaseRecord | null>;
  createRentPayment: (input: CreateRentPaymentInput) => RentPaymentRecord | null;
  payRent: (paymentId: string) => void;

  getUnitById: (unitId: string) => PropertyUnitManagement | null;
  getLeaseById: (leaseId: string) => LeaseRecord | null;
  getPaymentsByLease: (leaseId: string) => RentPaymentRecord[];
};

export const usePropertyManagementStore = create<PropertyManagementStore>((set, get) => ({
  units: [],
  leases: [],
  rentPayments: [],

  createUnit: (input) => {
    const listing = useListingStore.getState().getListingById(input.listingId);
    const wallet = useWalletStore.getState().wallet;

    if (!listing || !wallet) return null;
    if (!listing.walletLinked || !listing.orbitLinked) return null;

    const now = new Date().toISOString();

    const unit: PropertyUnitManagement = {
      id: `unit_${Math.random().toString(36).slice(2, 11)}`,
      listingId: listing.id,
      ownerOrbitId: input.ownerOrbitId,
      walletId: wallet.walletId,
      orbitLinked: true,
      walletLinked: true,
      unitLabel: input.unitLabel,
      propertyType: input.propertyType,
      address: listing.location.address,
      monthlyRent: listing.pricing.monthlyRent ?? 0,
      currency: listing.pricing.currency,
      securityDeposit: listing.pricing.securityDeposit ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      units: [unit, ...state.units],
    }));

    platformBus.emit("property:unit_created", { unit }, "pm");

    return unit;
  },

  createLease: async (input) => {
    const unit = get().getUnitById(input.unitId);
    const listing = useListingStore.getState().getListingById(input.listingId);
    const wallet = useWalletStore.getState().wallet;

    if (!unit || !listing || !wallet) return null;

    const now = new Date().toISOString();

    const lease: LeaseRecord = {
      id: `lease_${Math.random().toString(36).slice(2, 11)}`,
      listingId: input.listingId,
      unitId: input.unitId,
      ownerOrbitId: input.ownerOrbitId,
      tenantOrbitId: input.tenantOrbitId,
      walletId: wallet.walletId,
      rentAmount: unit.monthlyRent,
      currency: unit.currency,
      depositAmount: unit.securityDeposit,
      startDate: input.startDate,
      endDate: input.endDate,
      dueDay: input.dueDay,
      status: "active",
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      leases: [lease, ...state.leases],
    }));

    const conversation = await useOrbitThreadStore.getState().createThread({
      type: "property_management",
      participants: [
        { orbitId: input.ownerOrbitId, role: "owner" },
        { orbitId: input.tenantOrbitId, role: "tenant" },
      ],
      title: `Lease ${listing.title}`,
      listingId: listing.id,
      leaseId: lease.id,
    });

    await sendSystemMessage({
      conversationId: conversation.id,
      senderOrbitId: input.ownerOrbitId,
      body: "Lease conversation created",
      metadata: {
        leaseId: lease.id,
        listingId: listing.id,
      },
    });

    platformBus.emit("lease:created", { lease }, "pm");

    return lease;
  },

  createRentPayment: (input) => {
    const lease = get().getLeaseById(input.leaseId);
    if (!lease) return null;

    const now = new Date().toISOString();

    const payment: RentPaymentRecord = {
      id: `rent_${Math.random().toString(36).slice(2, 11)}`,
      leaseId: lease.id,
      listingId: lease.listingId,
      ownerOrbitId: lease.ownerOrbitId,
      tenantOrbitId: lease.tenantOrbitId,
      walletId: lease.walletId,
      amount: lease.rentAmount,
      currency: lease.currency,
      dueDate: input.dueDate,
      status: "pending",
      reference: input.reference,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      rentPayments: [payment, ...state.rentPayments],
    }));

    platformBus.emit("rent:payment_created", { payment }, "pm");
    platformBus.emit("rent:payment_required", {
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      leaseId: payment.leaseId,
    }, "pm");

    return payment;
  },

  payRent: async (paymentId) => {
    const payment = get().rentPayments.find((p) => p.id === paymentId);
    if (!payment) return;

    const walletStore = useWalletStore.getState();

    const tx = await walletStore.createTransaction({
      type: "payment",
      amount: payment.amount,
      currency: payment.currency,
      reference: `rent:${payment.id}`,
      status: "pending",
    });

    walletStore.markTransactionSuccess(tx.id);

    set((state) => ({
      rentPayments: state.rentPayments.map((p) =>
        p.id === paymentId
          ? {
              ...p,
              status: "paid" as const,
              paidAt: new Date().toISOString(),
              transactionId: tx.id,
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    }));

    platformBus.emit("rent:payment_paid", {
      paymentId,
      transactionId: tx.id,
    }, "pm");
  },

  getUnitById: (unitId) => {
    return get().units.find((u) => u.id === unitId) ?? null;
  },

  getLeaseById: (leaseId) => {
    return get().leases.find((l) => l.id === leaseId) ?? null;
  },

  getPaymentsByLease: (leaseId) => {
    return get().rentPayments.filter((p) => p.leaseId === leaseId);
  },
}));
