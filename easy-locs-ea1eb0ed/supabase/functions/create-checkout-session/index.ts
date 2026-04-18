import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(withEdgeLogging("create-checkout-session", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const rlResult = await checkServerRateLimit(req, "create-checkout-session", { maxRequests: 10, windowSeconds: 60 });
  if (!rlResult.allowed) return rateLimitResponse(rlResult);
  logger.info("checkout_session_started", { method: req.method });

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!token || token === anonKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe secret key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" });
    const body = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    if (body.lineItems && body.successUrl) {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: body.successUrl,
        cancel_url: body.cancelUrl,
        line_items: body.lineItems.map((item: { name: string; amount: number; currency: string; quantity: number }) => ({
          price_data: {
            currency: item.currency,
            product_data: { name: item.name },
            unit_amount: item.amount,
          },
          quantity: item.quantity,
        })),
        metadata: { ...(body.metadata ?? {}), user_id: userId },
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { orderId } = body;
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: order, error: orderErr } = await adminClient
      .from("orders")
      .select("id, total_amount, currency, merchant_id, user_id, status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (order.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Order does not belong to this user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    const authoritative_amount = order.total_amount;
    const piCurrency = (order.currency || "aed").toLowerCase();
    const amountInSmallest = Math.round(authoritative_amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallest,
      currency: piCurrency,
      capture_method: "manual",
      metadata: {
        order_id: orderId,
        user_id: userId,
        org_id: order.merchant_id || null,
      },
    });

    console.log(`[CREATE-CHECKOUT] PaymentIntent ${paymentIntent.id} created for order ${orderId}`);

    return new Response(
      JSON.stringify({
        provider: "stripe",
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        checkoutUrl: null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}));
