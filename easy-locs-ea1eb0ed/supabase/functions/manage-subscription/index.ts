import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const logStep = (step: string, details?: unknown) =>
  console.log(`[MANAGE-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "manage-subscription");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const { action, subscription_id, new_price_id } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: "action is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let subId = subscription_id;
    if (subId) {
      const { data: ownerCheck } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subId)
        .maybeSingle();

      if (!ownerCheck || ownerCheck.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Subscription not found or unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
        });
      }
    } else {
      const { data: subRecord } = await supabaseAdmin
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      subId = subRecord?.stripe_subscription_id;
    }

    if (!subId) {
      return new Response(JSON.stringify({ error: "No active subscription found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
      });
    }

    logStep("Managing subscription", { action, subscriptionId: subId });

    let result: Record<string, unknown>;

    switch (action) {
      case "cancel": {
        const updated = await stripe.subscriptions.update(subId, {
          cancel_at_period_end: true,
        });

        await supabaseAdmin.from("subscriptions").update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subId);

        result = { status: "cancelled", cancel_at: updated.cancel_at };
        logStep("Subscription set to cancel at period end", { cancelAt: updated.cancel_at });
        break;
      }

      case "reactivate": {
        const updated = await stripe.subscriptions.update(subId, {
          cancel_at_period_end: false,
        });

        await supabaseAdmin.from("subscriptions").update({
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subId);

        result = { status: "active" };
        logStep("Subscription reactivated");
        break;
      }

      case "upgrade":
      case "downgrade": {
        if (!new_price_id) {
          return new Response(JSON.stringify({ error: "new_price_id required for plan change" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
          });
        }

        const ALLOWED_PRICE_IDS = (Deno.env.get("ALLOWED_STRIPE_PRICE_IDS") || "").split(",").filter(Boolean);
        if (ALLOWED_PRICE_IDS.length > 0 && !ALLOWED_PRICE_IDS.includes(new_price_id)) {
          return new Response(JSON.stringify({ error: "Invalid plan selected" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
          });
        }

        const subscription = await stripe.subscriptions.retrieve(subId);
        const currentItemId = subscription.items.data[0]?.id;

        if (!currentItemId) {
          throw new Error("No subscription item found");
        }

        const updated = await stripe.subscriptions.update(subId, {
          items: [{
            id: currentItemId,
            price: new_price_id,
          }],
          proration_behavior: action === "upgrade" ? "always_invoice" : "create_prorations",
        });

        await supabaseAdmin.from("subscriptions").update({
          stripe_price_id: new_price_id,
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subId);

        result = { status: updated.status, action };
        logStep(`Subscription ${action}d`, { newPriceId: new_price_id });
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      action: `subscription_${action}`,
      metadata_json: { subscription_id: subId, action, new_price_id },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
