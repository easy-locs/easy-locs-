/**
 * Rental Domain Service — Use-case implementations.
 * Wires: ports + adapters + security guards + observability + events.
 * 
 * This is the entry point for all rental business operations.
 * UI hooks call this service, never the adapters directly.
 */
import type { RentalUseCases, CreateLeaseCommand, CollectRentCommand, RentCockpitView } from "./ports";
import type { DomainResult } from "../shared/types";
import { leaseAdapter, rentCallAdapter, propertyAdapter, rentalNotifications } from "./adapters/supabase.adapter";
import { rentalEvents } from "./events";
import { createDomainLogger } from "../shared/observability";
import { requireAuth, type SecurityContext } from "../shared/security-guards";

const log = createDomainLogger("rental");

export function createRentalService(ctx: SecurityContext | null): RentalUseCases {
  return {
    async createLease(cmd: CreateLeaseCommand) {
      requireAuth(ctx);
      const timer = log.timed("create_lease", { orgId: cmd.orgId });

      try {
        const lease = {
          id: crypto.randomUUID(),
          ...cmd,
          status: "active" as const,
          createdAt: new Date().toISOString(),
        };
        await leaseAdapter.save(lease);
        rentalEvents.leaseCreated(lease);
        timer.done();
        return { ok: true as const, data: lease };
      } catch (err) {
        timer.fail(err);
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async collectRent(cmd: CollectRentCommand) {
      requireAuth(ctx);
      const timer = log.timed("collect_rent", { leaseId: cmd.leaseId });

      try {
        const call = {
          id: crypto.randomUUID(),
          leaseId: cmd.leaseId,
          month: cmd.month,
          amount: cmd.amount,
          status: "paid" as const,
          paidAt: new Date().toISOString(),
        };
        await rentCallAdapter.save(call);
        await rentCallAdapter.markPaid(call.id, call.paidAt);
        rentalEvents.rentCollected(call);
        timer.done();
        return { ok: true as const, data: call };
      } catch (err) {
        timer.fail(err);
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async terminateLease(leaseId: string, reason: string) {
      requireAuth(ctx);
      try {
        await leaseAdapter.updateStatus(leaseId, "terminated");
        rentalEvents.leaseTerminated(leaseId, reason);
        log.info("lease_terminated", { leaseId, reason });
        return { ok: true as const, data: undefined };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getRentCockpit(orgId: string) {
      requireAuth(ctx);
      try {
        const [leases, overdue, properties] = await Promise.all([
          leaseAdapter.findByOrg(orgId),
          rentCallAdapter.findOverdue(orgId),
          propertyAdapter.findByOrg(orgId),
        ]);

        const activeLeases = leases.filter(l => l.status === "active");
        const totalRevenue = activeLeases.reduce((sum, l) => sum + l.monthlyRent.amount, 0);
        const tenantIds = new Set(activeLeases.map(l => l.tenantId));

        const view: RentCockpitView = {
          totalProperties: properties.length,
          totalTenants: tenantIds.size,
          collectionRate: activeLeases.length > 0
            ? Math.round(((activeLeases.length - overdue.length) / activeLeases.length) * 100)
            : 100,
          overdueCount: overdue.length,
          monthlyRevenue: { amount: totalRevenue, currency: "XOF" },
        };

        return { ok: true as const, data: view };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
