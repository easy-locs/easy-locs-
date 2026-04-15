import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rlResult = await checkServerRateLimit(req, "booking-approve");
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
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Not authenticated");
    const userId = claimsData.claims.sub;

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
      .update({ status: "confirmed", updated_at: now })
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
        body: "Owner approved the booking",
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
        event_type: "booking_confirmed",
        title: "Booking Approved",
        body: `Your booking ${bookingId} has been approved`,
        channels: ["in_app", "push"],
        priority: "high",
        entity_id: bookingId,
        entity_type: "booking",
        dedupe_key: `booking_confirmed_${bookingId}`,
        data: { booking_id: bookingId, domain: "booking" },
      }),
    }).then(async (resp) => {
      if (resp && !resp.ok) console.error("[booking-approve] notification dispatch HTTP", resp.status, await resp.text().catch(() => ""));
    }).catch((e: unknown) => console.error("[booking-approve] notification dispatch failed:", e));

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
