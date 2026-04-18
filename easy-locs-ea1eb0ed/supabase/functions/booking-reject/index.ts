import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "booking-reject");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) throw new Error("Not authenticated");
    const userId = user.id;

    const { bookingId } = await req.json();

    const { data: ownerOrbit } = await admin
      .from("profiles").select("*").eq("id", userId).single();

    const { data: booking } = await admin
      .from("bookings_v2").select("*").eq("id", bookingId).single();

    if (!booking) throw new Error("Booking not found");
    if (booking.owner_orbit_id !== ownerOrbit.id) throw new Error("Not allowed");

    const now = new Date().toISOString();

    const { data: updated, error: uErr } = await admin
      .from("bookings_v2")
      .update({ status: "cancelled", updated_at: now })
      .eq("id", bookingId)
      .select()
      .single();
    if (uErr) throw uErr;

    if (booking.conversation_id) {
      await admin.from("chat_messages_v2").insert({
        id: crypto.randomUUID(),
        conversation_id: booking.conversation_id,
        sender_orbit_id: ownerOrbit.id,
        type: "system",
        body: "Owner rejected the booking request",
        metadata: { bookingId },
        created_at: now,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    await fetch(`${supabaseUrl}/functions/v1/notification-dispatcher`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        user_id: booking.buyer_user_id,
        event_type: "booking_cancelled",
        title: "Booking Rejected",
        body: `Your booking ${bookingId} has been rejected`,
        channels: ["in_app", "push"],
        priority: "high",
        entity_id: bookingId,
        entity_type: "booking",
        dedupe_key: `booking_cancelled_${bookingId}`,
        data: { booking_id: bookingId, domain: "booking" },
      }),
    }).then(async (resp) => {
      if (resp && !resp.ok) console.error("[booking-reject] notification dispatch HTTP", resp.status, await resp.text().catch(() => ""));
    }).catch((e: unknown) => console.error("[booking-reject] notification dispatch failed:", e));

    return new Response(
      JSON.stringify({ booking: updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
