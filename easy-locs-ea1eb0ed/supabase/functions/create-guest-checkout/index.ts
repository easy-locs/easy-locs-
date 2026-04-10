/**
 * create-guest-checkout — Creates a Stripe Checkout session for guest (non-app) users.
 * No auth required. Accepts a payment_request_id and returns a checkout URL.
 * Supports Apple Pay + Card payments via Stripe Checkout.
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
    const { payment_request_id, payer_email } = await req.json();

    if (!payment_request_id) {
      return new Response(JSON.stringify({ error: "payment_request_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    // Fetch the payment request
    const { data: pr, error: prErr } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("id", payment_request_id)
      .single();

    if (prErr || !pr) {
      return new Response(JSON.stringify({ error: "Payment request not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
      });
    }

    if (pr.status === "paid") {
      return new Response(JSON.stringify({ error: "This payment request has already been paid" }), {
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

    const amountCents = Math.round(pr.amount * 100);
    const currency = (pr.currency || "EUR").toLowerCase();
    const origin = req.headers.get("origin") || "https://easy-locs.lovable.app";

    // Create Stripe Checkout session — supports Apple Pay, Google Pay, cards
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      ...(payer_email ? { customer_email: payer_email } : {}),
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: pr.title || "Payment",
              description: pr.subtitle || pr.description || `Payment request via Easy Locs`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        payment_request_id: pr.id,
        requester_id: pr.requester_id || pr.sender_id || "",
        source: "guest_checkout",
      },
      success_url: `${origin}/pay/guest/success?request_id=${pr.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pay/request/${pr.id}`,
    });

    // Store the stripe session id on the payment request
    await supabase
      .from("payment_requests")
      .update({
        stripe_payment_link: session.url,
        stripe_payment_intent_id: session.id,
      })
      .eq("id", pr.id);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (err: any) {
    console.error("create-guest-checkout error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
