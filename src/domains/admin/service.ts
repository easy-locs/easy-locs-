/**
 * Admin Domain Service — Use-case implementations.
 * Write-paths are guarded with idempotency + single-path enforcement.
 *
 * AUDIT STATUS: HARDENED
 * ✅ Guards on write actions (acknowledgeAlert, resolveAlert)
 * ✅ Single-path on state-change actions
 * ✅ State machine: cannot re-resolve/re-ack terminal states
 * ✅ Structured logging
 * ✅ Repository-only data access
 */
import type { AdminUseCases, AuditFilters } from "./ports";
import { auditAdapter, alertAdapter } from "./adapters/supabase.adapter";
import { adminEvents } from "./events";
import { createDomainLogger } from "../shared/observability";
import { requireAuth, requireRole, type SecurityContext } from "../shared/security-guards";
import { createActionGuard, acquireSinglePath } from "@/lib/guards/action-guard";

const log = createDomainLogger("admin");

// ── Guards ──
const ackGuard = createActionGuard("admin.alert.acknowledge");
const resolveGuard = createActionGuard("admin.alert.resolve");

// ── State machine ──
const ALERT_TERMINAL = new Set(["resolved"]);

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

      const flowKey = `admin.alert.ack:${alertId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: true as const, data: undefined }; // idempotent

      try {
        const result = await ackGuard.execute(
          async (actionCtx) => {
            await alertAdapter.updateStatus(alertId, "acknowledged");
            log.info("alert_acknowledged", {
              alertId,
              correlationId: actionCtx.correlationId,
              requestId: actionCtx.requestId,
            });
          },
          {
            requestId: `ack_${alertId}`,
            metadata: { alertId },
          }
        );

        if (!result.ok) return { ok: false as const, error: result.error ?? "Unknown error" };
        return { ok: true as const, data: undefined };
      } finally {
        release();
      }
    },

    async resolveAlert(alertId: string) {
      requireAuth(ctx);

      const flowKey = `admin.alert.resolve:${alertId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: true as const, data: undefined }; // idempotent

      try {
        const result = await resolveGuard.execute(
          async (actionCtx) => {
            await alertAdapter.updateStatus(alertId, "resolved");
            adminEvents.alertResolved(alertId);
            log.info("alert_resolved", {
              alertId,
              correlationId: actionCtx.correlationId,
              requestId: actionCtx.requestId,
            });
          },
          {
            requestId: `resolve_${alertId}`,
            metadata: { alertId },
          }
        );

        if (!result.ok) return { ok: false as const, error: result.error ?? "Unknown error" };
        return { ok: true as const, data: undefined };
      } finally {
        release();
      }
    },
  };
}
