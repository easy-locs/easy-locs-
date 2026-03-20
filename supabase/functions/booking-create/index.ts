import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function diffNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.max(1, Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24)));
}

function isRangeOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart).getTime() < new Date(bEnd).getTime() &&
    new Date(bStart).getTime() < new Date(aEnd).getTime();
}

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

    const body = await req.json();
    const { listingId, checkIn, checkOut, guestInfo } = body;

    const { data: buyerOrbit, error: boErr } = await admin
      .from("orbit_profiles_v2")
      .select("*")
      .eq("id", userId)
      .single();
    if (boErr) throw boErr;

    const { data: listing, error: lErr } = await admin
      .from("property_listings_v2")
      .select("*")
      .eq("id", listingId)
      .single();
    if (lErr || !listing) throw new Error("Listing not found");
    if (listing.status !== "published") throw new Error("Listing not published");

    // Check overlaps
    const { data: existingBookings } = await admin
      .from("bookings_v2")
      .select("check_in,check_out,status")
      .eq("listing_id", listingId);

    const activeStatuses = ["pending_payment", "pending_confirmation", "confirmed", "completed"];
    const overlap = (existingBookings ?? []).some((b: { check_in: string; check_out: string; status: string }) =>
      activeStatuses.includes(b.status) && isRangeOverlap(checkIn, checkOut, b.check_in, b.check_out)
    );
    if (overlap) throw new Error("Dates not available");

    const nights = diffNights(checkIn, checkOut);
    const nightPrice = listing.night_price ?? 0;
    const cleaningFee = listing.cleaning_fee ?? 0;
    const serviceFee = listing.service_fee ?? 0;
    const securityDeposit = listing.security_deposit ?? 0;
    const total = (nights * nightPrice) + cleaningFee + serviceFee + securityDeposit;
    const now = new Date().toISOString();
    const bookingId = crypto.randomUUID();
    const conversationId = crypto.randomUUID();

    const { error: convErr } = await admin.from("conversations_v2").insert({
      id: conversationId,
      type: "booking",
      participants: [
        { orbitId: buyerOrbit.orbit_id, role: "buyer" },
        { orbitId: listing.owner_orbit_id, role: "owner" },
      ],
      title: `Booking ${listing.title}`,
      listing_id: listingId,
      booking_id: bookingId,
      last_message_at: now,
      created_at: now,
    });
    if (convErr) console.error("conv insert error:", convErr);

    const booking = {
      id: bookingId,
      listing_id: listingId,
      buyer_orbit_id: buyerOrbit.orbit_id,
      buyer_user_id: userId,
      owner_orbit_id: listing.owner_orbit_id,
      owner_user_id: listing.owner_user_id,
      status: "pending_confirmation",
      amount: total,
      currency: listing.currency ?? "AED",
      check_in: checkIn,
      check_out: checkOut,
      guest_info: guestInfo ?? null,
      conversation_id: conversationId,
      created_at: now,
      updated_at: now,
    };

    const { data: savedBooking, error: bErr } = await admin
      .from("bookings_v2")
      .insert(booking)
      .select()
      .single();
    if (bErr) throw bErr;

    const msgId = crypto.randomUUID();
    await admin.from("chat_messages_v2").insert({
      id: msgId,
      conversation_id: conversationId,
      sender_orbit_id: listing.owner_orbit_id,
      type: "system",
      body: `Booking created for ${listing.title}`,
      metadata: { listingId, bookingId },
      created_at: now,
    });

    return new Response(
      JSON.stringify({ booking: savedBooking }),
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
