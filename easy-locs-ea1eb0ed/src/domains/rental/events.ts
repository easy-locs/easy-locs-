/**
 * Rental Domain — Event adapter (outbound port implementation).
 * Bridges rental domain events → unified domain event bus.
 */
import { publishDomainEvent, createDomainEvent } from "../shared/domain-event-bus";
import type { RentalEventPort, Lease, RentCall } from "./ports";

export const rentalEvents: RentalEventPort = {
  leaseCreated(lease: Lease) {
    publishDomainEvent(
      createDomainEvent("rental:lease_created", lease.id, "lease", {
        tenantId: lease.tenantId,
        propertyId: lease.propertyId,
        orgId: lease.orgId,
        monthlyRent: lease.monthlyRent,
      }, "rental")
    );
  },

  rentCollected(call: RentCall) {
    publishDomainEvent(
      createDomainEvent("rental:rent_collected", call.id, "rent_call", {
        leaseId: call.leaseId,
        month: call.month,
        amount: call.amount,
      }, "rental")
    );
  },

  leaseTerminated(leaseId: string, reason: string) {
    publishDomainEvent(
      createDomainEvent("rental:lease_terminated", leaseId, "lease", { reason }, "rental")
    );
  },
};
