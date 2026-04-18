import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SYNC-ICAL] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

interface ICalEvent {
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
  description?: string;
}

function parseICalDate(val: string): string {
  // Handles YYYYMMDD and YYYYMMDDTHHmmssZ formats
  if (val.length === 8) {
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
  }
  const clean = val.replace(/[TZ]/g, "");
  return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
}

function parseICal(text: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const blocks = text.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const lines = block.split(/\r?\n/);
    const ev: Record<string, string> = {};

    for (const line of lines) {
      const match = line.match(/^(UID|SUMMARY|DTSTART|DTEND|DESCRIPTION)[;:](.+)/i);
      if (match) {
        const key = match[1].toUpperCase();
        let val = match[2];
        // Remove parameters like VALUE=DATE:
        if (val.includes(":")) val = val.split(":").pop()!;
        ev[key] = val.trim();
      }
    }

    if (ev.DTSTART && ev.DTEND) {
      events.push({
        uid: ev.UID || crypto.randomUUID(),
        summary: ev.SUMMARY || "Guest",
        dtstart: parseICalDate(ev.DTSTART),
        dtend: parseICalDate(ev.DTEND),
        description: ev.DESCRIPTION || "",
      });
    }
  }

  return events;
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const rlResult = await checkServerRateLimit(req, "sync-ical");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    const { ical_url, property_id, provider, org_id } = await req.json();

    if (!ical_url || !property_id || !provider || !org_id) {
      throw new Error("Missing required fields: ical_url, property_id, provider, org_id");
    }

    // Verify the authenticated user belongs to the requested org
    const { data: membership } = await supabase
      .from("org_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("org_id", org_id)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Forbidden: not a member of this organization" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // SSRF protection: validate URL scheme and hostname
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(ical_url);
    } catch {
      throw new Error("Invalid iCal URL format");
    }

    if (parsedUrl.protocol !== "https:") {
      throw new Error("Only HTTPS iCal URLs are allowed");
    }

    const blockedHostnames = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "metadata.google.internal"];
    if (blockedHostnames.includes(parsedUrl.hostname.toLowerCase())) {
      throw new Error("Internal/private hostnames are not allowed");
    }

    const blockedIpPatterns = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.|0\.)/;
    if (blockedIpPatterns.test(parsedUrl.hostname)) {
      throw new Error("Private/internal IP addresses are not allowed");
    }

    logStep("Fetching iCal", { url: ical_url.substring(0, 60) + "...", provider });

    // Fetch the iCal feed with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let icalResponse: Response;
    try {
      icalResponse = await fetch(ical_url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!icalResponse.ok) {
      throw new Error(`Failed to fetch iCal: ${icalResponse.status}`);
    }

    // Enforce max response size (5MB)
    const contentLength = icalResponse.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      throw new Error("iCal feed too large (max 5MB)");
    }
    const icalText = await icalResponse.text();
    if (icalText.length > 5 * 1024 * 1024) {
      throw new Error("iCal feed too large (max 5MB)");
    }
    const events = parseICal(icalText);

    logStep("Parsed events", { count: events.length });

    // Upsert reservations
    let inserted = 0;
    let skipped = 0;

    for (const ev of events) {
      // Check if reservation already exists (by ota_reservation_id)
      const { data: existing } = await supabase
        .from("reservations")
        .select("id")
        .eq("ota_reservation_id", ev.uid)
        .eq("property_id", property_id)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const { error: insertError } = await supabase.from("reservations").insert({
        org_id,
        user_id: user.id,
        property_id,
        guest_name: ev.summary || "Guest",
        check_in: ev.dtstart,
        check_out: ev.dtend,
        status: "confirmed",
        ota_provider: provider,
        ota_reservation_id: ev.uid,
        notes: ev.description || "",
        amount: 0,
      });

      if (insertError) {
        logStep("Insert error", { uid: ev.uid, error: insertError.message });
      } else {
        inserted++;
      }
    }

    // Update OTA connection last_sync
    await supabase
      .from("ota_connections")
      .update({ last_sync_at: new Date().toISOString(), status: "active" })
      .eq("org_id", org_id)
      .eq("provider", provider);

    logStep("Sync complete", { inserted, skipped, total: events.length });

    return new Response(
      JSON.stringify({ success: true, inserted, skipped, total: events.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
