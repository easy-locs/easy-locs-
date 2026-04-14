import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DispatchPayload {
  user_id: string;
  event_type: string;
  title: string;
  body: string;
  channels?: ("in_app" | "push" | "email" | "sms")[];
  priority?: "low" | "normal" | "high" | "critical";
  data?: Record<string, any>;
  action_url?: string;
  entity_id?: string;
  entity_type?: string;
  dedupe_key?: string;
  locale?: string;
  email_template?: string;
  sms_phone?: string;
}

const PRIORITY_CHANNELS: Record<string, string[]> = {
  critical: ["in_app", "push", "email", "sms"],
  high: ["in_app", "push", "email"],
  normal: ["in_app"],
  low: ["in_app"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
      return new Response(
        JSON.stringify({ error: "user_id, event_type, and title are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (payload.dedupe_key) {
      const { data: existing } = await supabase
        .from("app_notifications")
        .select("id")
        .eq("user_id", user_id)
        .contains("metadata", { dedupe_key: payload.dedupe_key })
        .limit(1);
      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ status: "deduplicated", dedupe_key: payload.dedupe_key }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const channels = payload.channels ?? PRIORITY_CHANNELS[priority] ?? ["in_app"];

    const { data: userPrefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    const results: Record<string, { success: boolean; error?: string }> = {};

    if (channels.includes("in_app")) {
      const inAppDisabled = userPrefs && (userPrefs as any)[`in_app_${mapEventToCategory(event_type)}`] === false;
      if (!inAppDisabled) {
        const { data: notif, error } = await supabase
          .from("app_notifications")
          .insert({
            user_id,
            scope: data.domain ?? "global",
            category: event_type,
            title,
            body,
            severity: priority === "critical" ? "critical" : priority === "high" ? "warning" : "info",
            route: payload.action_url ?? null,
            entity_id: payload.entity_id ?? null,
            entity_type: payload.entity_type ?? null,
            metadata: {
              event_type,
              dedupe_key: payload.dedupe_key ?? null,
              ...data,
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
    }

    if (channels.includes("email")) {
      const emailDisabled = userPrefs && (userPrefs as any)[`email_${mapEventToCategory(event_type)}`] === false;
      const urgentOnly = userPrefs && (userPrefs as any).email_urgent_only === true;

      if (!emailDisabled && (!urgentOnly || priority === "critical" || priority === "high")) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name, locale")
          .eq("id", user_id)
          .maybeSingle();

        if (profile?.email) {
          try {
            const emailPayload: Record<string, any> = {
              event_type: payload.email_template ?? event_type,
              recipient_email: profile.email,
              recipient_name: profile.full_name ?? "",
              data: { title, body, ...data },
              locale: payload.locale ?? profile.locale ?? "en",
            };

            const internalSecret = Deno.env.get("INTERNAL_NOTIFICATION_SECRET") ?? "";
            const emailAuthToken = internalSecret || supabaseKey;
            const resp = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${emailAuthToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(emailPayload),
            });
            const emailResult = await resp.json();
            results.email = { success: resp.ok, error: resp.ok ? undefined : emailResult.error };
          } catch (e: unknown) {
            results.email = { success: false, error: e instanceof Error ? e.message : String(e) };
          }
        } else {
          results.email = { success: false, error: "no_email" };
        }
      } else {
        results.email = { success: false, error: emailDisabled ? "user_disabled" : "urgent_only_filter" };
      }
    }

    if (channels.includes("sms")) {
      if (payload.sms_phone || priority === "critical") {
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
      }
    }

    const successCount = Object.values(results).filter((r) => r.success).length;
    const failCount = Object.values(results).filter((r) => !r.success && r.error !== "user_disabled" && r.error !== "urgent_only_filter").length;

    await supabase.rpc("update_autonomy_status", {
      p_system_name: "notification_dispatcher",
      p_status: failCount === 0 ? "green" : failCount < successCount ? "yellow" : "red",
      p_error_message: failCount > 0
        ? Object.entries(results).filter(([_, r]) => !r.success).map(([ch, r]) => `${ch}: ${r.error}`).join("; ")
        : null,
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        status: "dispatched",
        channels: results,
        success_count: successCount,
        fail_count: failCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function mapEventToCategory(eventType: string): string {
  if (eventType.includes("message") || eventType.includes("orbit") || eventType.includes("c2c")) return "messages";
  if (eventType.includes("payment") || eventType.includes("wallet") || eventType.includes("settlement")) return "payments";
  if (eventType.includes("booking") || eventType.includes("order") || eventType.includes("ride")) return "bookings";
  if (eventType.includes("document") || eventType.includes("lease") || eventType.includes("dunning") || eventType.includes("receipt")) return "documents";
  if (eventType.includes("intervention") || eventType.includes("maintenance")) return "maintenance";
  return "messages";
}
