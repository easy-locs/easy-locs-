/**
 * Rental Domain — Concrete adapters wiring existing repositories to DDD ports.
 * 
 * Architecture: UI → Hooks → Domain Service → Adapter → Repository → DB
 */
import type {
  LeaseRepository, RentCallRepository, PropertyRepository,
  RentalNotificationPort, Lease, RentCall, Property,
} from "../ports";
import { rentalEvents } from "../events";
import { createDomainLogger } from "../../shared/observability";
import * as repo from "@/repositories/rental.repository";

const log = createDomainLogger("rental");

// ── Lease Adapter ──
export const leaseAdapter: LeaseRepository = {
  async findById(id: string): Promise<Lease | null> {
    const raw = await repo.fetchLease(id);
    return raw ? mapLease(raw) : null;
  },

  async findByOrg(orgId: string): Promise<Lease[]> {
    const rows = await repo.fetchLeasesByOrg(orgId);
    return rows.map(mapLease);
  },

  async save(lease: Lease): Promise<void> {
    await repo.updateLease(lease.id, {
      tenant_id: lease.tenantId,
      property_id: lease.propertyId,
      org_id: lease.orgId,
      start_date: lease.startDate,
      end_date: lease.endDate,
      rent_amount: lease.monthlyRent.amount,
      currency: lease.monthlyRent.currency,
      status: lease.status,
    });
    log.info("lease_saved", { leaseId: lease.id });
  },

  async updateStatus(id: string, status: Lease["status"]): Promise<void> {
    await repo.updateLease(id, { status });
    log.info("lease_status_updated", { leaseId: id, status });
  },
};

// ── RentCall Adapter ──
export const rentCallAdapter: RentCallRepository = {
  async findByLease(leaseId: string): Promise<RentCall[]> {
    // fetchRentCalls works by org, we filter by lease after
    // This is a pragmatic adapter — the port contract is clean
    const all = await repo.fetchRentCalls("", { leaseId });
    return all.map(mapRentCall);
  },

  async findOverdue(orgId: string): Promise<RentCall[]> {
    const all = await repo.fetchRentCalls(orgId, { paid: false });
    return all.map(mapRentCall);
  },

  async save(call: RentCall): Promise<void> {
    await repo.updateRentCall(call.id, {
      month: call.month,
      rent_amount: call.amount.amount,
      status: call.status,
    });
  },

  async markPaid(id: string, paidAt: string): Promise<void> {
    await repo.updateRentCall(id, { paid: true, paid_at: paidAt, status: "paid" });
    log.info("rent_marked_paid", { rentCallId: id });
  },
};

// ── Property Adapter ──
export const propertyAdapter: PropertyRepository = {
  async findById(id: string): Promise<Property | null> {
    const { fetchPropertyById } = await import("@/repositories/rental.repository");
    try {
      const raw = await fetchPropertyById(id);
      return raw ? mapProperty(raw) : null;
    } catch {
      return null;
    }
  },

  async findByOrg(orgId: string): Promise<Property[]> {
    const { fetchPropertiesByOrg } = await import("@/repositories/rental.repository");
    try {
      const rows = await fetchPropertiesByOrg(orgId);
      return rows.map(mapProperty);
    } catch {
      return [];
    }
  },
};

// ── Notification Adapter ──
export const rentalNotifications: RentalNotificationPort = {
  async notifyRentDue(tenantId: string, call: RentCall): Promise<void> {
    log.info("notify_rent_due", { tenantId, month: call.month });
    // Delegates to notification repository when wired
  },

  async notifyOverdue(tenantId: string, call: RentCall): Promise<void> {
    log.warn("notify_overdue", { tenantId, month: call.month });
  },
};

// ── Mappers (DB row → Domain aggregate) ──
function mapLease(row: any): Lease {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: row.property_id,
    orgId: row.org_id,
    startDate: row.start_date,
    endDate: row.end_date,
    monthlyRent: { amount: row.rent_amount ?? 0, currency: row.currency ?? "XOF" },
    status: row.status ?? "active",
    createdAt: row.created_at,
  };
}

function mapRentCall(row: any): RentCall {
  return {
    id: row.id,
    leaseId: row.lease_id ?? "",
    month: row.month,
    amount: { amount: row.rent_amount ?? 0, currency: row.currency ?? "XOF" },
    status: row.paid ? "paid" : "pending",
    paidAt: row.paid_at ?? undefined,
  };
}

function mapProperty(row: any): Property {
  return {
    id: row.id,
    orgId: row.org_id ?? "",
    label: row.label ?? row.name ?? "",
    address: row.address ?? "",
    country: row.country ?? "",
    city: row.city ?? "",
    type: row.property_type ?? row.type ?? "residential",
  };
}

/** Export event port for convenience */
export { rentalEvents };
