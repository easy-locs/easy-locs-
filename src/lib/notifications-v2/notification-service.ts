/**
 * Canonical Notification Service — notifications table.
 * SINGLE write + read path for all platform notifications.
 * Rerouted from legacy notifications_v2 → canonical notifications.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface NotificationInsert {
  user_id: string;
  actor: "client" | "rider" | "merchant" | "admin";
  domain: "mobility" | "food_delivery" | "parcel_delivery" | "wallet" | "orbit" | "merchant" | "admin" | "system";
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: "low" | "normal" | "high" | "critical";
  delivery_mode?: string[];
  action_url?: string;
  orbit_context_id?: string;
  related_job_id?: string;
  related_order_id?: string;
  related_payment_intent_id?: string;
  related_conversation_id?: string;
  dedupe_key?: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  actor: string;
  domain: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  priority: string;
  delivery_mode: string[];
  read_at: string | null;
  clicked_at: string | null;
  dismissed_at: string | null;
  action_url: string | null;
  orbit_context_id: string | null;
  related_job_id: string | null;
  related_order_id: string | null;
  related_payment_intent_id: string | null;
  related_conversation_id: string | null;
  dedupe_key: string | null;
  created_at: string;
}

/** Insert a notification — canonical write path */
export async function insertNotification(n: NotificationInsert): Promise<string | null> {
  const { data, error } = await db
    .from("notifications")
    .insert({
      user_id: n.user_id,
      type: n.type,
      title: n.title,
      body: n.body,
      priority: n.priority ?? "normal",
      channel: n.delivery_mode?.[0] ?? "in_app",
      cta_url: n.action_url ?? null,
      dedup_key: n.dedupe_key ?? null,
      metadata_json: {
        actor: n.actor,
        domain: n.domain,
        data: n.data ?? {},
        orbit_context_id: n.orbit_context_id ?? null,
        related_job_id: n.related_job_id ?? null,
        related_order_id: n.related_order_id ?? null,
        related_payment_intent_id: n.related_payment_intent_id ?? null,
        related_conversation_id: n.related_conversation_id ?? null,
      },
    })
    .select("id")
    .single();

  if (error) {
    // Dedupe conflict is expected — not an error
    if (error.code === "23505") return null;
    console.error("[notif-v2] insert error:", error.message);
    return null;
  }
  return data?.id ?? null;
}

/** Mark a single notification as read */
export async function markAsRead(id: string): Promise<void> {
  await db
    .from("notifications")
    .update({ read_at: new Date().toISOString(), read: true })
    .eq("id", id)
    .is("read_at", null);
}

/** Mark all notifications as read for a user */
export async function markAllAsRead(userId: string): Promise<void> {
  await db
    .from("notifications")
    .update({ read_at: new Date().toISOString(), read: true })
    .eq("user_id", userId)
    .is("read_at", null);
}

/** Dismiss a notification */
export async function dismissNotification(id: string): Promise<void> {
  await db
    .from("notifications")
    .update({ is_archived: true })
    .eq("id", id);
}

/** Get unread count for a user */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null)
    .or("is_archived.is.null,is_archived.eq.false");
  return count ?? 0;
}

/** Get notifications for a user */
export async function getUserNotifications(userId: string, limit = 50): Promise<NotificationRow[]> {
  const { data } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .or("is_archived.is.null,is_archived.eq.false")
    .order("created_at", { ascending: false })
    .limit(limit);
  // Map canonical notifications columns to NotificationRow shape
  return (data ?? []).map((n: any) => ({
    id: n.id,
    user_id: n.user_id,
    actor: n.metadata_json?.actor ?? "system",
    domain: n.metadata_json?.domain ?? "system",
    type: n.type,
    title: n.title,
    body: n.body ?? n.message ?? "",
    data: n.metadata_json?.data ?? {},
    priority: n.priority ?? "normal",
    delivery_mode: [n.channel ?? "in_app"],
    read_at: n.read_at,
    clicked_at: n.is_actioned ? n.read_at : null,
    dismissed_at: n.is_archived ? n.read_at : null,
    action_url: n.cta_url ?? n.link ?? null,
    orbit_context_id: n.metadata_json?.orbit_context_id ?? null,
    related_job_id: n.metadata_json?.related_job_id ?? null,
    related_order_id: n.metadata_json?.related_order_id ?? null,
    related_payment_intent_id: n.metadata_json?.related_payment_intent_id ?? null,
    related_conversation_id: n.metadata_json?.related_conversation_id ?? null,
    dedupe_key: n.dedup_key ?? null,
    created_at: n.created_at,
  }));
}

/** Record a click */
export async function markClicked(id: string): Promise<void> {
  await db
    .from("notifications")
    .update({ is_actioned: true, read_at: new Date().toISOString(), read: true })
    .eq("id", id);
}
