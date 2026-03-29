/**
 * Admin Domain — Concrete adapters wiring existing repositories to DDD ports.
 */
import type { AuditRepository, AlertRepository, AuditEntry, AdminAlert, AuditFilters } from "../ports";
import { adminEvents } from "../events";
import { createDomainLogger } from "../../shared/observability";
import * as adminRepo from "@/repositories/admin.repository";

const log = createDomainLogger("admin");

// ── Audit Adapter ──
export const auditAdapter: AuditRepository = {
  async findAll(filters: AuditFilters): Promise<AuditEntry[]> {
    const { supabase } = await import("@/integrations/supabase/client");
    let q = supabase.from("audit_logs").select("*");
    if (filters.userId) q = q.eq("user_id", filters.userId);
    if (filters.action) q = q.eq("action", filters.action);
    if (filters.from) q = q.gte("created_at", filters.from);
    if (filters.to) q = q.lte("created_at", filters.to);
    const { data } = await q.order("created_at", { ascending: false }).limit(filters.limit ?? 200);
    return (data ?? []).map(mapAuditEntry);
  },

  async append(entry: Omit<AuditEntry, "id" | "createdAt">): Promise<void> {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("audit_logs").insert({
      user_id: entry.userId,
      action: entry.action,
      metadata_json: entry.metadata ?? {},
    } as any);
    log.info("audit_appended", { action: entry.action });
  },
};

// ── Alert Adapter ──
export const alertAdapter: AlertRepository = {
  async findByStatus(status?: string): Promise<AdminAlert[]> {
    const { supabase } = await import("@/integrations/supabase/client");
    let q = supabase.from("admin_alerts").select("*");
    if (status) q = q.eq("status", status);
    const { data } = await q.order("created_at", { ascending: false }).limit(100);
    return (data ?? []).map(mapAlert);
  },

  async updateStatus(id: string, status: AdminAlert["status"]): Promise<void> {
    const { supabase } = await import("@/integrations/supabase/client");
    const updates: Record<string, any> = { status };
    if (status === "acknowledged") updates.acknowledged_at = new Date().toISOString();
    if (status === "resolved") updates.resolved_at = new Date().toISOString();
    await supabase.from("admin_alerts").update(updates).eq("id", id);
    log.info("alert_status_updated", { alertId: id, status });
  },
};

// ── Mappers ──
function mapAuditEntry(row: any): AuditEntry {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    action: row.action,
    entityType: row.entity_type ?? "",
    entityId: row.entity_id ?? "",
    metadata: row.metadata_json,
    createdAt: row.created_at,
  };
}

function mapAlert(row: any): AdminAlert {
  return {
    id: row.id,
    alertType: row.alert_type,
    severity: row.severity ?? "info",
    title: row.title,
    body: row.body,
    status: row.status ?? "open",
    createdAt: row.created_at,
  };
}

export { adminEvents };
