import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";
import { claimIdempotencyKey, finalizeIdempotencyKey } from "../_shared/idempotency.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface DispatchPayload {
  user_id: string;
  event_type: string;
  title: string;
  body: string;
  channels?: ("in_app" | "push" | "email" | "sms" | "whatsapp")[];
  priority?: "low" | "normal" | "high" | "critical";
  data?: Record<string, unknown>;
  action_url?: string;
  entity_id?: string;
  entity_type?: string;
  dedupe_key?: string;
  locale?: string;
  email_template?: string;
  sms_phone?: string;
  whatsapp_phone?: string;
}

interface NotificationPrefs {
  user_id: string;
  in_app_bookings?: boolean;
  in_app_deals?: boolean;
  in_app_documents?: boolean;
  in_app_maintenance?: boolean;
  in_app_messages?: boolean;
  in_app_payments?: boolean;
  push_bookings?: boolean;
  push_deals?: boolean;
  push_documents?: boolean;
  push_maintenance?: boolean;
  push_messages?: boolean;
  push_payments?: boolean;
  email_bookings?: boolean;
  email_deals?: boolean;
  email_documents?: boolean;
  email_maintenance?: boolean;
  email_messages?: boolean;
  email_payments?: boolean;
  email_urgent_only?: boolean;
  sms_bookings?: boolean;
  sms_deals?: boolean;
  sms_documents?: boolean;
  sms_maintenance?: boolean;
  sms_messages?: boolean;
  sms_payments?: boolean;
  whatsapp_bookings?: boolean;
  whatsapp_deals?: boolean;
  whatsapp_documents?: boolean;
  whatsapp_maintenance?: boolean;
  whatsapp_messages?: boolean;
  whatsapp_payments?: boolean;
  in_app_news?: boolean;
  push_news?: boolean;
  email_news?: boolean;
  sms_news?: boolean;
  whatsapp_news?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

type PrefsCategory = "bookings" | "deals" | "documents" | "maintenance" | "messages" | "payments" | "news";

const PRIORITY_CHANNELS: Record<string, string[]> = {
  critical: ["in_app", "push", "email", "sms", "whatsapp"],
  high: ["in_app", "push", "email"],
  normal: ["in_app"],
  low: ["in_app"],
};

function isChannelAllowed(
  prefs: NotificationPrefs | null,
  channel: string,
  category: PrefsCategory,
  priority: string,
): boolean {
  if (!prefs) return true;
  if (priority === "critical") return true;

  const key = `${channel}_${category}` as keyof NotificationPrefs;
  const value = prefs[key];
  if (typeof value === "boolean") return value;

  if (channel === "email" && prefs.email_urgent_only && priority !== "high") {
    return false;
  }

  return true;
}

function isInQuietHours(prefs: NotificationPrefs | null): boolean {
  if (!prefs?.quiet_hours_enabled || !prefs.quiet_hours_start || !prefs.quiet_hours_end) {
    return false;
  }
  const now = new Date();
  const hhmm = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
  const start = prefs.quiet_hours_start;
  const end = prefs.quiet_hours_end;
  if (start <= end) {
    return hhmm >= start && hhmm < end;
  }
  return hhmm >= start || hhmm < end;
}

Deno.serve(withEdgeLogging("notification-dispatcher", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const rlResult = await checkServerRateLimit(req, "notification-dispatcher");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const payload: DispatchPayload = await req.json();
    const { user_id, event_type, title, body, data = {}, priority = "normal" } = payload;

    if (!user_id || !event_type || !title) {
      logger.warn("invalid_payload", { user_id, event_type });
      return new Response(
        JSON.stringify({ error: "user_id, event_type, and title are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logger.info("dispatch_started", { userId: user_id, event_type, priority, channels: payload.channels });

    // Task #1004 — unified idempotency layer (claim + finalize).
    // Replays of the same (user, event_type, dedupe_key) within the TTL
    // return the prior result instead of re-executing.
    const idemNamespace = "notification-dispatcher";
    const idemKey = payload.dedupe_key
      ? `${user_id}:${event_type}:${payload.dedupe_key}`
      : null;

    if (idemKey) {
      const claim = await claimIdempotencyKey(
        supabase,
        idemNamespace,
        idemKey,
        { user_id, event_type, dedupe_key: payload.dedupe_key },
        60 * 60 * 24, // 24h TTL
      );
      if (!claim.isNew && claim.status === "succeeded") {
        logger.info("deduplicated_replay", { dedupe_key: payload.dedupe_key });
        return new Response(
          JSON.stringify({ status: "deduplicated", replayed: true, prior: claim.result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!claim.isNew && claim.status === "pending") {
        logger.info("deduplicated_inflight", { dedupe_key: payload.dedupe_key });
        return new Response(
          JSON.stringify({ status: "in_flight", dedupe_key: payload.dedupe_key }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202 }
        );
      }
    }

    const channels = payload.channels ?? PRIORITY_CHANNELS[priority] ?? ["in_app"];
    const category = mapEventToCategory(event_type);

    const { data: userPrefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    const prefs = userPrefs as NotificationPrefs | null;
    const results: Record<string, { success: boolean; error?: string }> = {};

    const quietHours = isInQuietHours(prefs);
    if (quietHours && priority !== "critical" && priority !== "high") {
      logger.info("quiet_hours_deferred", { userId: user_id });
      return new Response(
        JSON.stringify({ status: "deferred", reason: "quiet_hours", channels: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (channels.includes("in_app")) {
      if (isChannelAllowed(prefs, "in_app", category, priority)) {
        const { error } = await supabase
          .from("app_notifications")
          .insert({
            user_id,
            scope: (data.domain as string) ?? "global",
            category: event_type,
            title,
            body,
            severity: priority === "critical" ? "critical" : priority === "high" ? "warning" : "info",
            route: payload.action_url ?? null,
            entity_id: payload.entity_id ?? null,
            entity_type: payload.entity_type ?? event_type,
            metadata: {
              actor: data.actor ?? "system",
              domain: data.domain ?? "system",
              data: data,
              delivery_mode: channels,
              dedupe_key: payload.dedupe_key ?? null,
              related_conversation_id: data.related_conversation_id ?? null,
              related_order_id: data.related_order_id ?? null,
              related_payment_intent_id: data.related_payment_intent_id ?? null,
            },
          })
          .select("id")
          .single();

        results.in_app = error
          ? { success: false, error: error.message }
          : { success: true };
      } else {
        results.in_app = { success: false, error: "user_disabled" };
      }
    }

    if (channels.includes("push")) {
      if (isChannelAllowed(prefs, "push", category, priority)) {
        try {
          const resp = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id,
              title,
              body,
              data: { event_type, action_url: payload.action_url ?? "", ...data },
            }),
          });
          const pushResult = await resp.json();
          results.push = { success: resp.ok, error: resp.ok ? undefined : pushResult.error };
        } catch (e: unknown) {
          results.push = { success: false, error: e instanceof Error ? e.message : String(e) };
        }
      } else {
        results.push = { success: false, error: "user_disabled" };
      }
    }

    if (channels.includes("email")) {
      if (isChannelAllowed(prefs, "email", category, priority)) {
        const internalSecret = Deno.env.get("INTERNAL_NOTIFICATION_SECRET") ?? "";
        if (!internalSecret) {
          results.email = { success: false, error: "INTERNAL_NOTIFICATION_SECRET not configured" };
        } else {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name, locale")
            .eq("id", user_id)
            .maybeSingle();

          if (profile?.email) {
            try {
              const emailPayload: Record<string, string> = {
                event_type: payload.email_template ?? event_type,
                recipient_email: profile.email,
                recipient_name: profile.full_name ?? "",
                locale: payload.locale ?? profile.locale ?? "en",
              };

              const emailData: Record<string, string> = { title, body };
              for (const [k, v] of Object.entries(data)) {
                if (typeof v === "string" || typeof v === "number") emailData[k] = String(v);
              }

              const resp = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${internalSecret}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ ...emailPayload, data: emailData }),
              });
              const emailResult = await resp.json();
              results.email = { success: resp.ok, error: resp.ok ? undefined : emailResult.error };
            } catch (e: unknown) {
              results.email = { success: false, error: e instanceof Error ? e.message : String(e) };
            }
          } else {
            results.email = { success: false, error: "no_email" };
          }
        }
      } else {
        results.email = { success: false, error: "user_disabled" };
      }
    }

    if (channels.includes("sms")) {
      if (isChannelAllowed(prefs, "sms", category, priority)) {
        try {
          let phone = payload.sms_phone;
          if (!phone) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("phone")
              .eq("id", user_id)
              .maybeSingle();
            phone = profile?.phone;
          }

          if (phone) {
            const resp = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ phone, message: `${title}: ${body}` }),
            });
            const smsResult = await resp.json();
            results.sms = { success: resp.ok, error: resp.ok ? undefined : smsResult.error };
          } else {
            results.sms = { success: false, error: "no_phone" };
          }
        } catch (e: unknown) {
          results.sms = { success: false, error: e instanceof Error ? e.message : String(e) };
        }
      } else {
        results.sms = { success: false, error: "user_disabled" };
      }
    }

    if (channels.includes("whatsapp")) {
      if (isChannelAllowed(prefs, "whatsapp", category, priority)) {
        try {
          let phone = payload.whatsapp_phone ?? payload.sms_phone;
          if (!phone) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("phone")
              .eq("id", user_id)
              .maybeSingle();
            phone = profile?.phone;
          }

          if (phone) {
            const resp = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                phone,
                template: event_type,
                params: { title, body, ...data },
              }),
            });
            const waResult = await resp.json();
            results.whatsapp = { success: resp.ok, error: resp.ok ? undefined : waResult.error };
          } else {
            results.whatsapp = { success: false, error: "no_phone" };
          }
        } catch (e: unknown) {
          results.whatsapp = { success: false, error: e instanceof Error ? e.message : String(e) };
        }
      } else {
        results.whatsapp = { success: false, error: "user_disabled" };
      }
    }

    const successCount = Object.values(results).filter((r) => r.success).length;
    const failCount = Object.values(results).filter((r) => !r.success && r.error !== "user_disabled").length;

    await supabase.rpc("update_autonomy_status", {
      p_system_name: "notification_dispatcher",
      p_status: failCount === 0 ? "green" : failCount < successCount ? "yellow" : "red",
      p_error_message: failCount > 0
        ? Object.entries(results).filter(([_, r]) => !r.success).map(([ch, r]) => `${ch}: ${r.error}`).join("; ")
        : null,
    }).catch(() => {});

    logger.info("dispatch_completed", {
      userId: user_id,
      event_type,
      successCount,
      failCount,
      channels: Object.keys(results),
    });

    const responseBody = {
      status: "dispatched",
      channels: results,
      success_count: successCount,
      fail_count: failCount,
    };

    if (idemKey) {
      await finalizeIdempotencyKey(supabase, idemNamespace, idemKey, "succeeded", responseBody);
    }

    return new Response(
      JSON.stringify(responseBody),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("dispatch_error", { error: e as Error });
    // Best-effort: release the idempotency claim on failure so retries
    // can proceed (instead of stranding the key in `pending` for 24h).
    try {
      const payloadForFail: DispatchPayload | null = await req.clone().json().catch(() => null);
      if (payloadForFail?.dedupe_key && payloadForFail.user_id && payloadForFail.event_type) {
        await finalizeIdempotencyKey(
          supabase,
          "notification-dispatcher",
          `${payloadForFail.user_id}:${payloadForFail.event_type}:${payloadForFail.dedupe_key}`,
          "failed",
          { error: msg },
        );
      }
    } catch { /* never let cleanup mask the original error */ }
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}));

function mapEventToCategory(eventType: string): PrefsCategory {
  if (eventType.includes("message") || eventType.includes("orbit") || eventType.includes("c2c")) return "messages";
  if (eventType.includes("payment") || eventType.includes("wallet") || eventType.includes("settlement")) return "payments";
  if (eventType.includes("booking") || eventType.includes("order") || eventType.includes("ride")) return "bookings";
  if (eventType.includes("document") || eventType.includes("lease") || eventType.includes("dunning") || eventType.includes("receipt")) return "documents";
  if (eventType.includes("intervention") || eventType.includes("maintenance")) return "maintenance";
  if (eventType.includes("news") || eventType.startsWith("news_")) return "news";
  return "messages";
}
