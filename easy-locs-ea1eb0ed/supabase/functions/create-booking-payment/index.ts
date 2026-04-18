import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const logStep = (step: string, details?: any) => {
  console.log(`[BOOKING-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

/** Country → currency mapping */
const COUNTRY_CURRENCY: Record<string, string> = {
  FR: "eur", ES: "eur", DE: "eur", IT: "eur", PT: "eur", NL: "eur", BE: "eur", LU: "eur", AT: "eur", IE: "eur", GR: "eur", FI: "eur",
  GB: "gbp", US: "usd", CA: "cad", AU: "aud", CH: "chf", SE: "sek", NO: "nok", DK: "dkk", PL: "pln", CZ: "czk", HU: "huf",
  MA: "mad", TN: "tnd", AE: "aed", SA: "sar", BR: "brl", MX: "mxn", TH: "thb",
};

Deno.serve(withEdgeLogging("create-booking-payment", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const rlResult = await checkServerRateLimit(req, "create-booking-payment", { maxRequests: 10, windowSeconds: 900 });
  if (!rlResult.allowed) {
    logStep("Rate limited");
    return rateLimitResponse(rlResult);
  }

  try {
    const { booking_request_id, listing_id, guest_email, guest_name, amount, nights, property_label, origin } = await req.json();
    logStep("Request received", { booking_request_id, listing_id, amount, nights });

    if (!nights || nights <= 0) {
      return new Response(JSON.stringify({ error: "Invalid nights" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }
    if (!guest_email) {
      return new Response(JSON.stringify({ error: "Guest email required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }
    if (!listing_id) {
      return new Response(JSON.stringify({ error: "Listing ID required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const ALLOWED_ORIGINS = [
      "https://www.easy-locs.com",
      "https://easy-locs.com",
    ];
    const safeOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the listing details including price for server-side validation
    let stripeAccountId: string | null = null;
    let currency = "eur";
    let propertyId: string | null = null;

    const { data: listing } = await supabaseClient
      .from("public_listings")
      .select("org_id, property_id, price_per_night")
      .eq("id", listing_id)
      .single();

    if (!listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
      });
    }

    const pricePerNight = listing.price_per_night ?? 0;
    if (pricePerNight <= 0) {
      return new Response(JSON.stringify({ error: "Listing has no valid price" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }
    const expectedTotal = pricePerNight * nights;

    if (!amount || Math.abs(amount - expectedTotal) > 0.01) {
      logStep("Price mismatch", { clientAmount: amount, expectedTotal, pricePerNight, nights });
      return new Response(JSON.stringify({ error: `Amount mismatch: expected ${expectedTotal}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const verifiedAmount = expectedTotal;

    propertyId = listing.property_id;
    if (listing.org_id) {
      const { data: org } = await supabaseClient
        .from("orgs")
        .select("stripe_account_id, stripe_onboarding_complete")
        .eq("id", listing.org_id)
        .single();
      if (org?.stripe_account_id && org?.stripe_onboarding_complete) {
        stripeAccountId = org.stripe_account_id;
      }
    }

    // Resolve currency from property country
    if (propertyId) {
      const { data: prop } = await supabaseClient.from("properties").select("country").eq("id", propertyId).single();
      if (prop?.country) currency = COUNTRY_CURRENCY[prop.country] || "eur";
    }

    // Date overlap validation
    if (booking_request_id) {
      const { data: br } = await supabaseClient
        .from("bookings")
        .select("property_id, check_in, check_out")
        .eq("id", booking_request_id)
        .single();
      if (br) {
        const { data: overlapping } = await supabaseClient
          .from("seasonal_bookings")
          .select("id")
          .eq("property_id", br.property_id)
          .eq("status", "confirmed")
          .lt("check_in", br.check_out)
          .gt("check_out", br.check_in)
          .limit(1);
        if (overlapping && overlapping.length > 0) {
          logStep("Date overlap detected, rejecting payment");
          return new Response(JSON.stringify({ error: "Ces dates ne sont plus disponibles." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 409,
          });
        }
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const successUrl = `${safeOrigin}/listing/${listing_id}?payment=success`;
    const cancelUrl = `${safeOrigin}/listing/${listing_id}?payment=cancelled`;

    // Build payment method types — card always supports 3D Secure automatically
    const paymentMethodTypes: string[] = ["card"];

    // Add SEPA for EUR payments
    if (currency === "eur") {
      paymentMethodTypes.push("sepa_debit");
    }

    const sessionParams: any = {
      customer_email: guest_email,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Réservation${property_label ? ` — ${property_label}` : ""}`,
              description: `${nights} nuit${nights > 1 ? "s" : ""} × ${pricePerNight} ${currency.toUpperCase()}`,
            },
            unit_amount: Math.round(verifiedAmount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        booking_request_id: booking_request_id || "",
        listing_id: listing_id || "",
        type: "seasonal_booking",
      },
    };

    if (stripeAccountId) {
      sessionParams.payment_intent_data = {
        transfer_data: { destination: stripeAccountId },
      };
      logStep("Using Connect destination", { stripeAccountId });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    if (booking_request_id) {
      await supabaseClient
        .from("bookings")
        .update({ status: "payment_pending" } as any)
        .eq("id", booking_request_id);
    }

    // Send confirmation email to guest
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          to: guest_email,
          subject: `💳 Payment link for your booking${property_label ? ` — ${property_label}` : ""}`,
          message: `Hello ${guest_name || "Guest"},\n\nYour booking payment of ${verifiedAmount} ${currency.toUpperCase()} for ${nights} night(s) is ready.\n\nPlease complete your payment to confirm your reservation.\n\nThank you!`,
        }),
      });
      logStep("Confirmation email sent to guest");
    } catch (e) {
      logStep("Email send error (non-blocking)", { error: String(e) });
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
}));
