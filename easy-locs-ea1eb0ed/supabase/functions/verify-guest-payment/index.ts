/**
 * verify-guest-payment — Verifies a Stripe Checkout session completed
 * and marks the payment_request as paid.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { session_id, payment_request_id } = await req.json();

    if (!session_id || !payment_request_id) {
      return new Response(JSON.stringify({ error: "session_id and payment_request_id required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ verified: false, status: session.payment_status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // Verify metadata matches
    if (session.metadata?.payment_request_id !== payment_request_id) {
      return new Response(JSON.stringify({ error: "Session does not match payment request" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    // Mark as paid
    const { error: updateErr } = await supabase
      .from("payment_requests")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: session.payment_intent as string || session.id,
        payment_tx_id: session.payment_intent as string || session.id,
      })
      .eq("id", payment_request_id)
      .eq("status", "pending");

    if (updateErr) {
      console.error("Failed to update payment request:", updateErr);
    }

    return new Response(JSON.stringify({
      verified: true,
      payment_intent: session.payment_intent,
      customer_email: session.customer_details?.email || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (err: any) {
    console.error("verify-guest-payment error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
