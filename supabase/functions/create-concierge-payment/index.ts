import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CONCIERGE-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, service_id, amount, currency, guest_email, guest_name, service_title, origin, booking_slug } = await req.json();
    logStep("Request received", { order_id, service_id, amount });

    if (!order_id) {
      return new Response(JSON.stringify({ error: "Order ID required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }
    if (!guest_email) {
      return new Response(JSON.stringify({ error: "Guest email required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }
    if (!service_id) {
      return new Response(JSON.stringify({ error: "Service ID required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const ALLOWED_ORIGINS = ["https://www.easy-locs.com", "https://easy-locs.com"];
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

    // Get the service to validate price server-side
    const { data: service } = await supabaseClient
      .from("concierge_services")
      .select("id, org_id, price, currency, commission_type, commission_amount, title")
      .eq("id", service_id)
      .single();

    if (!service) throw new Error("Service not found");

    // Server-side price validation
    const expectedAmount = service.price;
    if (Math.abs(amount - expectedAmount) > 0.01) {
      logStep("Price mismatch", { clientAmount: amount, expectedAmount });
      throw new Error(`Amount mismatch: expected ${expectedAmount}`);
    }

    // Check for Stripe Connect
    let stripeAccountId: string | null = null;
    if (service.org_id) {
      const { data: org } = await supabaseClient
        .from("orgs")
        .select("stripe_account_id, stripe_onboarding_complete")
        .eq("id", service.org_id)
        .single();
      if (org?.stripe_account_id && org?.stripe_onboarding_complete) {
        stripeAccountId = org.stripe_account_id;
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const serviceCurrency = (service.currency || currency || "eur").toLowerCase();
    const successUrl = `${safeOrigin}/book/${booking_slug || service_id}?payment=success`;
    const cancelUrl = `${safeOrigin}/book/${booking_slug || service_id}?payment=cancelled`;

    // Calculate commission for platform fee
    let applicationFee = 0;
    if (stripeAccountId && service.commission_amount > 0) {
      if (service.commission_type === "fixed") {
        applicationFee = service.commission_amount;
      } else {
        applicationFee = (expectedAmount * service.commission_amount) / 100;
      }
    }

    const sessionParams: any = {
      customer_email: guest_email,
      line_items: [
        {
          price_data: {
            currency: serviceCurrency,
            product_data: {
              name: service.title || service_title || "Concierge Service",
              description: `Booking for ${guest_name}`,
            },
            unit_amount: Math.round(expectedAmount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_method_types: serviceCurrency === "eur" ? ["card", "sepa_debit"] : ["card"],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        order_id: order_id,
        service_id: service_id,
        type: "concierge_service",
      },
    };

    if (stripeAccountId) {
      sessionParams.payment_intent_data = {
        transfer_data: { destination: stripeAccountId },
      };
      if (applicationFee > 0) {
        sessionParams.payment_intent_data.application_fee_amount = Math.round(applicationFee * 100);
      }
      logStep("Using Connect destination", { stripeAccountId, applicationFee });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id });

    // Update order with stripe session ID
    await supabaseClient
      .from("concierge_orders")
      .update({ stripe_session_id: session.id, status: "awaiting_payment", payment_status: "pending" } as any)
      .eq("id", order_id);

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
