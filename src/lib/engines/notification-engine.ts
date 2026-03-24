/**
 * Central Notification Engine
 * Single source of truth for all platform notifications.
 * Event → Template → Notification → Realtime delivery.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

// ── Types ──

export interface NotificationPayload {
  user_id: string;
  event_type: string;
  entity_id?: string;
  entity_type?: string;
  org_id?: string;
  variables?: Record<string, string | number>;
  channel?: string;
  priority_override?: string;
  dedup_key?: string;
  metadata?: Record<string, any>;
}

export interface LiveStatusPayload {
  entity_id: string;
  entity_type: string;
  user_id?: string;
  status_label: string;
  status_subtitle?: string;
  status_code: string;
  eta_min?: number;
  eta_max?: number;
  progress_percent?: number;
  live_step_index?: number;
  live_step_total?: number;
  live_visual_type?: string;
  actor_name?: string;
  context_action_url?: string;
}

interface NotificationTemplate {
  template_key: string;
  event_type: string;
  notification_type: string;
  priority: string;
  default_channel: string;
  title_template: string;
  body_template: string | null;
  subtitle_template: string | null;
  icon_key: string | null;
  cta_label_template: string | null;
  cta_url_template: string | null;
  cooldown_seconds: number;
  groupable: boolean;
  group_key_template: string | null;
}

// ── Template Cache ──

let templateCache: Map<string, NotificationTemplate> | null = null;
let templateCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getTemplates(): Promise<Map<string, NotificationTemplate>> {
  if (templateCache && Date.now() - templateCacheTime < CACHE_TTL) return templateCache;

  const { data } = await db
    .from("notification_templates")
    .select("*")
    .eq("active", true);

  templateCache = new Map((data ?? []).map((t: any) => [t.event_type, t]));
  templateCacheTime = Date.now();
  return templateCache;
}

// ── Template Rendering ──

function renderTemplate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(variables[key] ?? ""));
}

// ── Anti-Spam / Dedup ──

async function checkCooldown(userId: string, eventType: string, cooldownSeconds: number): Promise<boolean> {
  if (cooldownSeconds <= 0) return true;

  const cutoff = new Date(Date.now() - cooldownSeconds * 1000).toISOString();
  const { data } = await db
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .gte("created_at", cutoff)
    .limit(1);

  return !data?.length;
}

async function checkDedup(dedupKey: string): Promise<boolean> {
  if (!dedupKey) return true;
  const { data } = await db
    .from("notifications")
    .select("id")
    .eq("dedup_key", dedupKey)
    .limit(1);
  return !data?.length;
}

// ── User Preferences ──

async function isChannelEnabled(userId: string, channel: string, category: string): Promise<boolean> {
  const { data } = await db
    .from("notification_preferences")
    .select("enabled")
    .eq("user_id", userId)
    .eq("channel", channel)
    .eq("category", category)
    .maybeSingle();

  // Default enabled if no preference set
  return data?.enabled ?? true;
}

// ── Core: Send Notification ──

export async function sendNotification(payload: NotificationPayload): Promise<{ success: boolean; id?: string; reason?: string }> {
  const templates = await getTemplates();
  const template = templates.get(payload.event_type);

  if (!template) {
    console.warn(`[NotificationEngine] No template for event: ${payload.event_type}`);
    return { success: false, reason: "no_template" };
  }

  const vars = payload.variables ?? {};
  const channel = payload.channel ?? template.default_channel;
  const priority = payload.priority_override ?? template.priority;

  // Check cooldown
  if (template.cooldown_seconds > 0) {
    const allowed = await checkCooldown(payload.user_id, payload.event_type, template.cooldown_seconds);
    if (!allowed) return { success: false, reason: "cooldown" };
  }

  // Check dedup
  if (payload.dedup_key) {
    const allowed = await checkDedup(payload.dedup_key);
    if (!allowed) return { success: false, reason: "duplicate" };
  }

  // Check user preferences (skip for urgent/critical)
  if (priority !== "urgent" && priority !== "critical") {
    const enabled = await isChannelEnabled(payload.user_id, channel, template.notification_type);
    if (!enabled) return { success: false, reason: "user_disabled" };
  }

  // Render templates
  const title = renderTemplate(template.title_template, vars);
  const body = template.body_template ? renderTemplate(template.body_template, vars) : null;
  const subtitle = template.subtitle_template ? renderTemplate(template.subtitle_template, vars) : null;
  const ctaLabel = template.cta_label_template ? renderTemplate(template.cta_label_template, vars) : null;
  const ctaUrl = template.cta_url_template ? renderTemplate(template.cta_url_template, vars) : null;
  const groupKey = template.group_key_template ? renderTemplate(template.group_key_template, vars) : null;

  // Insert notification
  const { data, error } = await db
    .from("notifications")
    .insert({
      user_id: payload.user_id,
      org_id: payload.org_id ?? null,
      entity_id: payload.entity_id ?? null,
      entity_type: payload.entity_type ?? null,
      event_type: payload.event_type,
      type: template.notification_type,
      notification_type: template.notification_type,
      priority,
      channel,
      title,
      message: body,
      body,
      subtitle,
      cta_label: ctaLabel,
      cta_url: ctaUrl,
      icon_key: template.icon_key,
      dedup_key: payload.dedup_key ?? null,
      group_key: groupKey,
      metadata_json: payload.metadata ?? null,
      read: false,
      is_seen: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[NotificationEngine] insert error:", error.message);
    return { success: false, reason: error.message };
  }

  return { success: true, id: data.id };
}

// ── Live Status ──

export async function updateLiveStatus(payload: LiveStatusPayload): Promise<boolean> {
  // Deactivate previous active status for this entity
  await db
    .from("live_status_snapshots")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("entity_id", payload.entity_id)
    .eq("entity_type", payload.entity_type)
    .eq("is_active", true);

  // Insert new active status
  const { error } = await db
    .from("live_status_snapshots")
    .insert({
      entity_id: payload.entity_id,
      entity_type: payload.entity_type,
      user_id: payload.user_id ?? null,
      status_label: payload.status_label,
      status_subtitle: payload.status_subtitle ?? null,
      status_code: payload.status_code,
      eta_min: payload.eta_min ?? null,
      eta_max: payload.eta_max ?? null,
      progress_percent: payload.progress_percent ?? 0,
      live_step_index: payload.live_step_index ?? 0,
      live_step_total: payload.live_step_total ?? 1,
      live_visual_type: payload.live_visual_type ?? "progress",
      actor_name: payload.actor_name ?? null,
      context_action_url: payload.context_action_url ?? null,
    });

  return !error;
}

/** Get active live status for an entity */
export async function getActiveLiveStatus(entityId: string, entityType: string) {
  const { data } = await db
    .from("live_status_snapshots")
    .select("*")
    .eq("entity_id", entityId)
    .eq("entity_type", entityType)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// ── Notification Queries ──

export async function getUserNotifications(userId: string, limit = 50) {
  const { data } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false)
    .eq("is_archived", false);
  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  const { error } = await db
    .from("notifications")
    .update({ read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId);
  return !error;
}

export async function markAllAsRead(userId: string): Promise<boolean> {
  const { error } = await db
    .from("notifications")
    .update({ read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("read", false);
  return !error;
}

export async function archiveNotification(notificationId: string): Promise<boolean> {
  const { error } = await db
    .from("notifications")
    .update({ is_archived: true })
    .eq("id", notificationId);
  return !error;
}

// ── Preferences ──

export async function setNotificationPreference(
  userId: string,
  channel: string,
  category: string,
  enabled: boolean
): Promise<boolean> {
  const { error } = await db
    .from("notification_preferences")
    .upsert({
      user_id: userId,
      channel,
      category,
      enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,channel,category" });
  return !error;
}

export async function getUserPreferences(userId: string) {
  const { data } = await db
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId);
  return data ?? [];
}

// ── Realtime Subscription ──

export function subscribeToNotifications(userId: string, callback: (notification: any) => void) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

export function subscribeToLiveStatus(entityId: string, entityType: string, callback: (status: any) => void) {
  return supabase
    .channel(`live_status:${entityId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_status_snapshots",
        filter: `entity_id=eq.${entityId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
}
