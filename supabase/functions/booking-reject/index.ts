import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      .from("orbit_profiles_v2").select("*").eq("id", userId).single();

    const { data: booking } = await admin
      .from("bookings_v2").select("*").eq("id", bookingId).single();

    if (!booking) throw new Error("Booking not found");
    if (booking.owner_orbit_id !== ownerOrbit.orbit_id) throw new Error("Not allowed");

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
        sender_orbit_id: ownerOrbit.orbit_id,
        type: "system",
        body: "Owner rejected the booking request",
        metadata: { bookingId },
        created_at: now,
      });
    }

    await admin.from("notifications").insert({
      id: crypto.randomUUID(),
      user_id: booking.buyer_user_id,
      type: "booking",
      title: "Booking rejected",
      body: `Booking ${bookingId} has been rejected`,
      read: false,
      metadata_json: { bookingId },
    });

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
