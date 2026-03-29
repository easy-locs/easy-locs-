/**
 * Rental Domain — Port interfaces (hexagonal architecture).
 * These are the contracts. Adapters implement them.
 * Business logic depends ONLY on ports, never on adapters directly.
 */
import type { Money, DateRange, DomainResult } from "../shared/types";

// ── Aggregates ──
export interface Lease {
  id: string;
  tenantId: string;
  propertyId: string;
  orgId: string;
  startDate: string;
  endDate: string;
  monthlyRent: Money;
  status: "draft" | "active" | "terminated" | "expired";
  createdAt: string;
}

export interface RentCall {
  id: string;
  leaseId: string;
  month: string;
  amount: Money;
  status: "pending" | "paid" | "overdue" | "partial";
  paidAt?: string;
}

export interface Property {
  id: string;
  orgId: string;
  label: string;
  address: string;
  country: string;
  city: string;
  type: string;
}

// ── Inbound Ports (use-cases) ──
export interface RentalUseCases {
  createLease(cmd: CreateLeaseCommand): Promise<DomainResult<Lease>>;
  collectRent(cmd: CollectRentCommand): Promise<DomainResult<RentCall>>;
  terminateLease(leaseId: string, reason: string): Promise<DomainResult<void>>;
  getRentCockpit(orgId: string): Promise<DomainResult<RentCockpitView>>;
}

export interface CreateLeaseCommand {
  tenantId: string;
  propertyId: string;
  orgId: string;
  startDate: string;
  endDate: string;
  monthlyRent: Money;
}

export interface CollectRentCommand {
  leaseId: string;
  month: string;
  amount: Money;
  paymentMethod: string;
}

export interface RentCockpitView {
  totalProperties: number;
  totalTenants: number;
  collectionRate: number;
  overdueCount: number;
  monthlyRevenue: Money;
}

// ── Outbound Ports (driven side) ──
export interface LeaseRepository {
  findById(id: string): Promise<Lease | null>;
  findByOrg(orgId: string): Promise<Lease[]>;
  save(lease: Lease): Promise<void>;
  updateStatus(id: string, status: Lease["status"]): Promise<void>;
}

export interface RentCallRepository {
  findByLease(leaseId: string): Promise<RentCall[]>;
  findOverdue(orgId: string): Promise<RentCall[]>;
  save(call: RentCall): Promise<void>;
  markPaid(id: string, paidAt: string): Promise<void>;
}

export interface PropertyRepository {
  findById(id: string): Promise<Property | null>;
  findByOrg(orgId: string): Promise<Property[]>;
}

export interface RentalNotificationPort {
  notifyRentDue(tenantId: string, call: RentCall): Promise<void>;
  notifyOverdue(tenantId: string, call: RentCall): Promise<void>;
}

export interface RentalEventPort {
  leaseCreated(lease: Lease): void;
  rentCollected(call: RentCall): void;
  leaseTerminated(leaseId: string, reason: string): void;
}
