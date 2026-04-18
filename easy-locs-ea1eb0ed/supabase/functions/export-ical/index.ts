import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

function escapeIcal(str: string): string {
  return (str || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const rlResult = await checkServerRateLimit(req, "export-ical");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const userId = userData.user.id;

    // Get user's org
    const { data: membership } = await supabaseClient
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (!membership) throw new Error("No org found");

    // Fetch reservations for this org
    const { data: reservations } = await supabaseClient
      .from("reservations")
      .select("id, check_in, check_out, guest_name, amount, currency, status, property_id, properties(label)")
      .eq("org_id", membership.org_id)
      .order("check_in", { ascending: true });

    const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    let ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Easy-Locs//Reservations//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Easy-Locs Reservations",
    ];

    for (const r of reservations || []) {
      const propertyLabel = (r as any).properties?.label || "Property";
      const summary = `${escapeIcal(r.guest_name)} — ${escapeIcal(propertyLabel)}`;
      const description = `Status: ${r.status}\\nAmount: ${r.amount} ${r.currency || "EUR"}`;

      ical.push(
        "BEGIN:VEVENT",
        `UID:${r.id}@easylocs`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${formatDate(r.check_in)}`,
        `DTEND;VALUE=DATE:${formatDate(r.check_out)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${escapeIcal(description)}`,
        `STATUS:${r.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
        "END:VEVENT"
      );
    }

    ical.push("END:VCALENDAR");

    return new Response(ical.join("\r\n"), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "attachment; filename=easylocs-reservations.ics",
      },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
