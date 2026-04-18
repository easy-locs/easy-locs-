import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
/**
 * create-listing-checkout — Stripe Checkout for listing_renewal & listing_boost.
 * Backend-authoritative pricing. No frontend pricing trust.
 */
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const log = (step: string, d?: any) =>
  console.log(`[LISTING-CHECKOUT] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

// Backend-authoritative pricing (AED)
const PRICING: Record<string, number> = {
  listing_renewal: 29,
  boost_basic: 49,
  boost_premium: 99,
  boost_featured: 199,
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "create-listing-checkout");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Auth required
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;
    log("User authenticated", { email: user.email });

    const body = await req.json();
    const { listingId, paymentType, boostTier } = body;

    // Validate payment type
    if (!["listing_renewal", "listing_boost"].includes(paymentType)) {
      return new Response(JSON.stringify({ error: "Invalid payment type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate listing exists and belongs to user
    const { data: listing, error: listingErr } = await supabase
      .from("listings")
      .select("id, user_id, title, status, active, listing_expires_at, boost_enabled")
      .eq("id", listingId)
      .maybeSingle();

    if (listingErr || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (listing.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not your listing" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve price
    let priceKey: string;
    let description: string;
    if (paymentType === "listing_renewal") {
      priceKey = "listing_renewal";
      description = `Listing Renewal — ${listing.title || listingId}`;
    } else {
      const validTiers = ["basic", "premium", "featured"];
      if (!boostTier || !validTiers.includes(boostTier)) {
        return new Response(JSON.stringify({ error: "Invalid boost tier" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      priceKey = `boost_${boostTier}`;
      description = `Listing Boost (${boostTier}) — ${listing.title || listingId}`;
    }

    const amount = PRICING[priceKey];
    if (!amount) {
      return new Response(JSON.stringify({ error: "Price not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Creating checkout", { priceKey, amount, listingId, paymentType });

    // Check existing Stripe customer
    let customerId: string | undefined;
    if (user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://www.easy-locs.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "aed",
            unit_amount: Math.round(amount * 100),
            product_data: { name: description },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard/seller?payment=success&type=${paymentType}`,
      cancel_url: `${origin}/dashboard/seller?payment=canceled`,
      metadata: {
        type: paymentType,
        listing_id: listingId,
        boost_tier: boostTier || "",
        user_id: user.id,
        price_key: priceKey,
        amount_aed: String(amount),
      },
    });

    log("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
