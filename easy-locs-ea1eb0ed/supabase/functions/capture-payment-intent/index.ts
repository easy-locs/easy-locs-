import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "capture-payment-intent", { maxRequests: 10, windowSeconds: 60 });
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503,
      });
    }

    const { paymentIntentId, orderId } = await req.json();
    if (!paymentIntentId) {
      return new Response(JSON.stringify({ error: "paymentIntentId required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const piMeta = paymentIntent.metadata || {};
    const piUserId = piMeta.user_id || piMeta.buyer_id;
    const piOrderId = piMeta.order_id;
    const piOrgId = piMeta.org_id || piMeta.seller_id;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    let authorized = false;

    if (piUserId === user.id) {
      authorized = true;
    }

    if (!authorized && piOrgId) {
      const { data: membership } = await supabaseAdmin
        .from("org_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("org_id", piOrgId)
        .maybeSingle();

      const adminRoles = ["owner", "admin", "manager"];
      if (membership && adminRoles.includes(membership.role)) {
        authorized = true;
      }
    }

    if (!authorized && piOrgId) {
      const { data: orgOwner } = await supabaseAdmin
        .from("orgs")
        .select("id")
        .eq("id", piOrgId)
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (orgOwner) {
        authorized = true;
      }
    }

    if (!authorized) {
      console.warn(`[CAPTURE-PAYMENT] Denied: user ${user.id} not authorized for PI ${paymentIntentId}`);
      return new Response(JSON.stringify({ error: "Not authorized to capture this payment" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
      });
    }

    if (orderId && piOrderId && orderId !== piOrderId) {
      return new Response(JSON.stringify({ error: "Order ID mismatch" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    if (paymentIntent.status !== "requires_capture") {
      return new Response(
        JSON.stringify({ error: `Cannot capture: status is ${paymentIntent.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 },
      );
    }

    console.log(`[CAPTURE-PAYMENT] Capturing ${paymentIntentId} for order ${orderId} by user ${user.id}`);

    const captured = await stripe.paymentIntents.capture(paymentIntentId);

    console.log(`[CAPTURE-PAYMENT] Captured successfully. Status: ${captured.status}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: captured.status,
        paymentIntentId: captured.id,
        amount: captured.amount,
        currency: captured.currency,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CAPTURE-PAYMENT] Error:", message);
    return new Response(
      JSON.stringify({ error: `Capture failed: ${message}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
