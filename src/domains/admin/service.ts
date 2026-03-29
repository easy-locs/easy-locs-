/**
 * Admin Domain Service — Use-case implementations.
 */
import type { AdminUseCases, AuditFilters } from "./ports";
import { auditAdapter, alertAdapter } from "./adapters/supabase.adapter";
import { adminEvents } from "./events";
import { createDomainLogger } from "../shared/observability";
import { requireAuth, requireRole, type SecurityContext } from "../shared/security-guards";

const log = createDomainLogger("admin");

export function createAdminService(ctx: SecurityContext | null): AdminUseCases {
  return {
    async getAuditLog(filters: AuditFilters) {
      requireAuth(ctx);
      try {
        const entries = await auditAdapter.findAll(filters);
        return { ok: true as const, data: entries };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getAlerts(status?: string) {
      requireAuth(ctx);
      try {
        const alerts = await alertAdapter.findByStatus(status);
        return { ok: true as const, data: alerts };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async acknowledgeAlert(alertId: string) {
      requireAuth(ctx);
      try {
        await alertAdapter.updateStatus(alertId, "acknowledged");
        log.info("alert_acknowledged", { alertId });
        return { ok: true as const, data: undefined };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async resolveAlert(alertId: string) {
      requireAuth(ctx);
      try {
        await alertAdapter.updateStatus(alertId, "resolved");
        adminEvents.alertResolved(alertId);
        log.info("alert_resolved", { alertId });
        return { ok: true as const, data: undefined };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
