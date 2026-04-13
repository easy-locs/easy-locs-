/**
 * moderation.repository — DB operations for AdminModerationPanel.
 */
import { db } from "@/services/db";

export async function fetchModerationData() {
  const [driversRes, disputesRes] = await Promise.all([
    db("rider_presence").select("*").limit(100),
    db("delivery_disputes").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  return { drivers: driversRes.data || [], disputes: disputesRes.data || [] };
}

export async function fetchDriverNames(userIds: string[]) {
  if (userIds.length === 0) return [];
  const { data } = await db("profiles").select("id, name, first_name, last_name").in("id", userIds);
  return data || [];
}

export async function suspendDriver(userId: string) {
  await db("rider_presence").update({ is_online: false, is_available: false }).eq("user_id", userId);
}

export async function insertModerationAuditLog(userId: string, orgId: string, action: string, metadata: Record<string, any>) {
  await db("audit_logs").insert({ user_id: userId, org_id: orgId, action, metadata_json: metadata });
}

export async function insertModerationNotification(notification: Record<string, any>) {
  await db("app_notifications").insert(notification);
}

export async function resolveDispute(disputeId: string, resolution: string) {
  await db("delivery_disputes").update({
    status: "resolved", resolution, resolved_at: new Date().toISOString(),
  }).eq("id", disputeId);
}
