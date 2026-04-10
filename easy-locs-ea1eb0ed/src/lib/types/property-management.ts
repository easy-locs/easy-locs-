import type { CurrencyCode } from "@/lib/types/app";

export type LeaseStatus =
  | "draft"
  | "active"
  | "late"
  | "terminated"
  | "completed";

export type RentPaymentStatus =
  | "pending"
  | "paid"
  | "late"
  | "partial"
  | "cancelled";

export interface PropertyUnitManagement {
  id: string;
  listingId: string;
  ownerOrbitId: string;
  walletId: string;
  orbitLinked: boolean;
  walletLinked: boolean;

  unitLabel: string;
  propertyType: "apartment" | "villa" | "studio" | "room" | "shop" | "office";
  address: string;

  monthlyRent: number;
  currency: CurrencyCode;
  securityDeposit?: number;

  createdAt: string;
  updatedAt: string;
}

export interface LeaseRecord {
  id: string;
  listingId: string;
  unitId: string;
  ownerOrbitId: string;
  tenantOrbitId: string;
  walletId: string;

  rentAmount: number;
  currency: CurrencyCode;
  depositAmount?: number;

  startDate: string;
  endDate: string;
  dueDay: number;
  status: LeaseStatus;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentPaymentRecord {
  id: string;
  leaseId: string;
  listingId: string;
  ownerOrbitId: string;
  tenantOrbitId: string;
  walletId: string;

  amount: number;
  currency: CurrencyCode;
  dueDate: string;
  paidAt?: string;
  status: RentPaymentStatus;

  transactionId?: string;
  reference?: string;

  createdAt: string;
  updatedAt: string;
}
