// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const { data: claims, error: claimsErr } = await userClient.auth.getUser(token);
    if (claimsErr || !claims.user) throw new Error("Not authenticated");
    const userId = claims.user.id;

    const { bookingId, reason } = await req.json();

    const { data: orbit } = await admin
      .from("orbit_profiles_v2")
      .select("*")
      .eq("id", userId)
      .single();
    if (!orbit) throw new Error("No orbit profile");

    const { data: booking } = await admin
      .from("bookings_v2")
      .select("*")
      .eq("id", bookingId)
      .single();
    if (!booking) throw new Error("Booking not found");

    const isParticipant =
      booking.owner_orbit_id === orbit.orbit_id || booking.buyer_orbit_id === orbit.orbit_id;
    if (!isParticipant) throw new Error("Not allowed");

    const now = new Date().toISOString();
    const refundRequest = {
      id: `refund_${crypto.randomUUID().slice(0, 8)}`,
      booking_id: bookingId,
      rent_payment_id: null,
      owner_orbit_id: booking.owner_orbit_id,
      buyer_or_tenant_orbit_id: booking.buyer_orbit_id,
      reason: reason ?? null,
      status: "pending",
      amount: booking.amount,
      currency: booking.currency,
      stripe_payment_intent_id: booking.transaction_id ?? null,
      stripe_refund_id: null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await admin
      .from("refund_requests")
      .insert(refundRequest)
      .select()
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ refundRequest: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
