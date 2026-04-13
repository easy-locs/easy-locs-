// deno-lint-ignore-file no-explicit-any
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe key not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" });

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

    const { refundRequestId } = await req.json();

    const { data: orbit } = await admin
      .from("orbit_profiles_v2")
      .select("*")
      .eq("id", userId)
      .single();
    if (!orbit) throw new Error("No orbit profile");

    const { data: refundRequest } = await admin
      .from("refund_requests")
      .select("*")
      .eq("id", refundRequestId)
      .single();
    if (!refundRequest) throw new Error("Refund request not found");
    if (refundRequest.owner_orbit_id !== orbit.orbit_id) throw new Error("Only owner can process");
    if (!refundRequest.stripe_payment_intent_id) throw new Error("Missing payment intent");

    const refund = await stripe.refunds.create({
      payment_intent: refundRequest.stripe_payment_intent_id,
    });

    const now = new Date().toISOString();

    const { data: updatedRefund, error: updateErr } = await admin
      .from("refund_requests")
      .update({
        status: "processed",
        stripe_refund_id: refund.id,
        updated_at: now,
      })
      .eq("id", refundRequestId)
      .select()
      .single();
    if (updateErr) throw updateErr;

    if (refundRequest.booking_id) {
      await admin.from("bookings_v2").update({
        status: "refunded",
        updated_at: now,
      }).eq("id", refundRequest.booking_id);
    }

    return new Response(JSON.stringify({ refundRequest: updatedRefund }), {
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
