import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rlResult = await checkServerRateLimit(req, "create-stripe-intent");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    let userEmail: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      userEmail = data.user?.email ?? undefined;
    }

    const { amount, currency, orderId, metadata } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    const currencyLower = (currency ?? "aed").toLowerCase();
    const EU_CURRENCIES = new Set([
      "eur", "gbp", "chf", "sek", "dkk", "nok", "pln", "czk", "huf",
      "ron", "bgn", "hrk", "isk",
    ]);
    const isEuropean = EU_CURRENCIES.has(currencyLower) ||
      (metadata?.country_code && ["FR","DE","IT","ES","PT","NL","BE","LU","AT","IE","FI","GR","SI","SK","EE","LV","LT","MT","CY","HR","BG","RO","SE","DK","NO","IS","CH","GB","CZ","HU","PL"].includes(metadata.country_code));

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currencyLower,
      customer: customerId,
      ...(isEuropean
        ? {
            payment_method_options: {
              card: { request_three_d_secure: "any" },
            },
          }
        : {}),
      metadata: {
        ...(metadata ?? {}),
        order_id: orderId ?? "",
        psd2_sca_applied: isEuropean ? "true" : "false",
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("create-stripe-intent error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
