import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
/**
 * create-wallet-topup — Creates a Stripe Checkout session for wallet top-up
 * Credits wallet_ledger on success via stripe-webhook
 */
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const logStep = (step: string, details?: any) => {
  console.log(`[WALLET-TOPUP] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const rlResult = await checkServerRateLimit(req, "create-wallet-topup");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;
    logStep("User authenticated", { email: user.email });

    const { amount, currency = "AED" } = await req.json();

    if (!amount || amount <= 0 || amount > 50000) {
      return new Response(JSON.stringify({ error: "Invalid amount (1-50000)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = (Deno.env.get("STRIPE_SECRET_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim();
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const amountInCents = Math.round(amount * 100);
    const origin = req.headers.get("origin") || "https://www.easy-locs.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Wallet Top-Up: ${amount} ${currency}`,
              description: "Add funds to your wallet",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_method_options: {
        card: { request_three_d_secure: "any" },
      },
      success_url: `${origin}/wallet/hub?topup=success`,
      cancel_url: `${origin}/wallet/hub?topup=cancelled`,
      metadata: {
        type: "wallet_topup",
        user_id: user.id,
        amount: amount.toString(),
        currency,
      },
    });

    // Create pending payment record
    await supabase.from("payments").insert({
      user_id: user.id,
      amount,
      currency,
      provider: "stripe",
      provider_payment_id: session.id,
      payment_type: "wallet_topup",
      status: "pending",
      reference_type: "wallet_topup",
      metadata_json: { stripe_session_id: session.id },
    });

    logStep("Checkout session created", { sessionId: session.id, amount, currency });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: "Payment error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
