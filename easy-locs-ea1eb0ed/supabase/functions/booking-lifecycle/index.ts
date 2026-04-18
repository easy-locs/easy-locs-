import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

/**
 * Booking Lifecycle Automation
 * Sends automated messages based on booking stage:
 * - pre_arrival: 2 days before check-in
 * - check_in_instructions: Day of check-in
 * - during_stay: Mid-stay check
 * - check_out_reminder: Day before check-out
 * - post_stay: Day after check-out (review request)
 */

const TEMPLATES: Record<string, { subject: string; title: string; body: string }> = {
  pre_arrival: {
    subject: "🏠 Your stay is approaching — {property}",
    title: "🏠 Arriving soon!",
    body: `Hello {guest},\n\nYour stay at {property} is approaching!\n\n📅 Check-in: {check_in}\n📅 Check-out: {check_out}\n\nYour host will share check-in instructions shortly. If you have any questions, don't hesitate to reach out.\n\nWe look forward to welcoming you!`,
  },
  check_in_day: {
    subject: "🔑 Check-in today — {property}",
    title: "🔑 Welcome! Check-in today",
    body: `Hello {guest},\n\nToday is the day! Welcome to {property}.\n\nPlease check your email or Guest Portal for check-in instructions from your host.\n\n🏠 Address: {address}\n📅 Check-out: {check_out}\n\nEnjoy your stay!`,
  },
  check_out_reminder: {
    subject: "📋 Check-out tomorrow — {property}",
    title: "📋 Check-out reminder",
    body: `Hello {guest},\n\nJust a friendly reminder that your check-out from {property} is tomorrow ({check_out}).\n\nPlease make sure to:\n✅ Return all keys\n✅ Check for personal belongings\n✅ Follow any check-out instructions from your host\n\nThank you for your stay!`,
  },
  post_stay: {
    subject: "⭐ How was your stay at {property}?",
    title: "⭐ We'd love your feedback",
    body: `Hello {guest},\n\nThank you for staying at {property}!\n\nWe hope you had a wonderful experience. Your feedback helps us improve and helps future guests.\n\nPlease don't hesitate to contact us if you need anything.\n\nSee you next time!`,
  },
};

function fillTemplate(template: { subject: string; title: string; body: string }, vars: Record<string, string>) {
  const fill = (s: string) => Object.entries(vars).reduce((r, [k, v]) => r.replaceAll(`{${k}}`, v), s);
  return { subject: fill(template.subject), title: fill(template.title), body: fill(template.body) };
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Cron-secret authorization check
    const cronSecret = req.headers.get("x-cron-secret");
    const { data: cfg } = await supabase.from("internal_config").select("value").eq("key", "cron_secret").single();
    if (!cronSecret || cronSecret !== cfg?.value) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);
    const todayStr = formatDate(today);
    const twoDaysLater = formatDate(new Date(today.getTime() + 2 * 86400000));
    const tomorrowStr = formatDate(new Date(today.getTime() + 86400000));
    const yesterdayStr = formatDate(new Date(today.getTime() - 86400000));

    // Fetch all active bookings
    const { data: bookings } = await supabase
      .from("seasonal_bookings")
      .select("*, properties:property_id(label, address, city)")
      .in("status", ["confirmed"])
      .gte("check_out", yesterdayStr);

    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    let processed = 0;

    for (const booking of bookings) {
      const guestEmail = booking.guest_email;
      if (!guestEmail) continue;

      const prop = (booking as any).properties || {};
      const vars = {
        guest: booking.guest_name,
        property: prop.label || "Your Property",
        address: `${prop.address || ""}, ${prop.city || ""}`.trim().replace(/^,\s*/, ""),
        check_in: booking.check_in,
        check_out: booking.check_out,
      };

      let template: { subject: string; title: string; body: string } | null = null;
      let eventType = "";

      // Pre-arrival: 2 days before check-in
      if (booking.check_in === twoDaysLater) {
        template = fillTemplate(TEMPLATES.pre_arrival, vars);
        eventType = "pre_arrival";
      }
      // Check-in day
      else if (booking.check_in === todayStr) {
        template = fillTemplate(TEMPLATES.check_in_day, vars);
        eventType = "check_in_day";
      }
      // Check-out reminder: day before check-out
      else if (booking.check_out === tomorrowStr) {
        template = fillTemplate(TEMPLATES.check_out_reminder, vars);
        eventType = "check_out_reminder";
      }
      // Post-stay: day after check-out
      else if (booking.check_out === yesterdayStr) {
        template = fillTemplate(TEMPLATES.post_stay, vars);
        eventType = "post_stay";
      }

      if (!template || !eventType) continue;

      // Idempotency: check if already sent
      const { data: existing } = await supabase
        .from("audit_logs")
        .select("id")
        .eq("action", `lifecycle_${eventType}`)
        .eq("org_id", booking.org_id)
        .ilike("metadata_json", `%${booking.id}%`)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Send email
      if (SENDGRID_API_KEY) {
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: guestEmail }] }],
            from: { email: "noreply@easy-locs.com", name: "Easy-Locs" },
            subject: template.subject,
            content: [{
              type: "text/html",
              value: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
                <h2 style="color:#1a1a1a;text-align:center;">${template.title}</h2>
                <div style="color:#555;font-size:15px;line-height:1.7;white-space:pre-wrap;">${template.body}</div>
                <p style="text-align:center;color:#aaa;font-size:11px;margin-top:32px;">EASY-LOCS® — Food, Services, Taxi, Hotel in One App</p>
              </div>`,
            }],
          }),
        });
      }

      // Create in-app notification for owner
      const { data: orgData } = await supabase.from("orgs").select("owner_user_id").eq("id", booking.org_id).single();
      if (orgData?.owner_user_id) {
        await supabase.from("notifications").insert({
          user_id: orgData.owner_user_id,
          org_id: booking.org_id,
          type: "info",
          title: template.title,
          message: `Auto-sent to ${booking.guest_name}: ${eventType.replace(/_/g, " ")}`,
          link: "/dashboard/seasonal-rentals",
        });
      }

      // Audit log for idempotency
      await supabase.from("audit_logs").insert({
        action: `lifecycle_${eventType}`,
        org_id: booking.org_id,
        metadata_json: { booking_id: booking.id, guest_email: guestEmail, event: eventType },
      });

      processed++;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[BOOKING-LIFECYCLE] Error:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
