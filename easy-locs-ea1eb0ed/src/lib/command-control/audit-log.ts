import { db } from "@/services/db";
import type { AuditActorType, AuditLogEntry } from "./types";

export async function logAuditEvent(params: {
  event_type: string;
  actor_type: AuditActorType;
  actor_name?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, unknown>;
  rollback_tag?: string;
}): Promise<void> {
  try {
    await db("command_audit_log").insert({
      event_type: params.event_type,
      actor_type: params.actor_type,
      actor_name: params.actor_name || null,
      action: params.action,
      target_type: params.target_type || null,
      target_id: params.target_id || null,
      details: params.details || {},
      rollback_tag: params.rollback_tag || null,
    });
  } catch (err) {
    console.error("[audit-log] Failed to log event:", err);
  }
}

export async function queryAuditLog(params: {
  event_type?: string;
  actor_type?: AuditActorType;
  actor_name?: string;
  target_type?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: AuditLogEntry[]; count: number }> {
  let query = db("command_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params.event_type) query = query.eq("event_type", params.event_type);
  if (params.actor_type) query = query.eq("actor_type", params.actor_type);
  if (params.actor_name) query = query.eq("actor_name", params.actor_name);
  if (params.target_type) query = query.eq("target_type", params.target_type);
  if (params.from_date) query = query.gte("created_at", params.from_date);
  if (params.to_date) query = query.lte("created_at", params.to_date);
  if (params.search) query = query.or(`action.ilike.%${params.search}%,event_type.ilike.%${params.search}%`);

  const limit = params.limit || 50;
  const offset = params.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    console.error("[audit-log] Query failed:", error);
    return { data: [], count: 0 };
  }
  return { data: (data || []) as AuditLogEntry[], count: count || 0 };
}

export async function getAuditLogStats(): Promise<{
  totalEvents: number;
  byActorType: Record<string, number>;
  byEventType: Record<string, number>;
  last24h: number;
}> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { count: totalEvents } = await db("command_audit_log")
    .select("*", { count: "exact", head: true });

  const { count: last24h } = await db("command_audit_log")
    .select("*", { count: "exact", head: true })
    .gte("created_at", yesterday);

  const { data: recentEntries } = await db("command_audit_log")
    .select("actor_type, event_type")
    .gte("created_at", yesterday);

  const byActorType: Record<string, number> = {};
  const byEventType: Record<string, number> = {};

  for (const entry of recentEntries || []) {
    byActorType[entry.actor_type] = (byActorType[entry.actor_type] || 0) + 1;
    byEventType[entry.event_type] = (byEventType[entry.event_type] || 0) + 1;
  }

  return {
    totalEvents: totalEvents || 0,
    byActorType,
    byEventType,
    last24h: last24h || 0,
  };
}
