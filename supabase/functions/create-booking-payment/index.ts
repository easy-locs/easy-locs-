import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[BOOKING-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_request_id, listing_id, guest_email, guest_name, amount, nights, property_label, origin } = await req.json();
    logStep("Request received", { booking_request_id, listing_id, amount, nights });

    if (!amount || amount <= 0) throw new Error("Invalid amount");
    if (!guest_email) throw new Error("Guest email required");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the org's Stripe Connect account if available
    let stripeAccountId: string | null = null;
    if (listing_id) {
      const { data: listing } = await supabaseClient
        .from("public_listings")
        .select("org_id")
        .eq("id", listing_id)
        .single();
      if (listing?.org_id) {
        const { data: org } = await supabaseClient
          .from("orgs")
          .select("stripe_account_id, stripe_onboarding_complete")
          .eq("id", listing.org_id)
          .single();
        if (org?.stripe_account_id && org?.stripe_onboarding_complete) {
          stripeAccountId = org.stripe_account_id;
        }
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const baseOrigin = origin || "https://easylocs.lovable.app";
    const successUrl = listing_id 
      ? `${baseOrigin}/listing/${listing_id}?payment=success`
      : `${baseOrigin}?payment=success`;
    const cancelUrl = listing_id
      ? `${baseOrigin}/listing/${listing_id}?payment=cancelled`
      : `${baseOrigin}?payment=cancelled`;

    const sessionParams: any = {
      customer_email: guest_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Réservation${property_label ? ` — ${property_label}` : ""}`,
              description: `${nights} nuit${nights > 1 ? "s" : ""}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_method_types: ["card"],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        booking_request_id: booking_request_id || "",
        listing_id: listing_id || "",
        type: "seasonal_booking",
      },
    };

    // If Connect account exists, use destination charges
    if (stripeAccountId) {
      sessionParams.payment_intent_data = {
        transfer_data: { destination: stripeAccountId },
      };
      logStep("Using Connect destination", { stripeAccountId });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Update booking request with payment link
    if (booking_request_id) {
      await supabaseClient
        .from("booking_requests")
        .update({ status: "payment_pending" } as any)
        .eq("id", booking_request_id);
    }

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
