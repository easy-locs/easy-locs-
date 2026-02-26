import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

const PRODUCT_MAP: Record<string, string> = {
  // New plans
  "prod_U354fxGmmhSvn0": "local_monthly",
  "prod_U355WIZ1brDxXV": "local_annual",
  "prod_U355aIW4nePfxQ": "global_monthly",
  "prod_U355FFHHJ8rgAT": "global_annual",
  // Legacy plans
  "prod_U2yLjzJN4Y7LYb": "local_monthly",
  "prod_U2zlUjPtdVVjIw": "local_annual",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, checking trial");
      const trialResult = await checkTrial(supabaseClient, user.id);
      return new Response(JSON.stringify(trialResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    const trialingSubs = await stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 });
    const activeSub = subscriptions.data[0] || trialingSubs.data[0];

    if (activeSub) {
      const subscriptionEnd = new Date(activeSub.current_period_end * 1000).toISOString();
      const productId = activeSub.items.data[0].price.product as string;
      const plan = PRODUCT_MAP[productId] || "unknown";
      const isStripeTrial = activeSub.status === "trialing";
      const tier = plan.startsWith("global") ? "global" : "local";

      logStep("Active subscription", { plan, tier, subscriptionEnd, status: activeSub.status });

      await supabaseClient.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: activeSub.id,
        plan,
        status: isStripeTrial ? "trialing" : "active",
        current_period_end: subscriptionEnd,
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({
        subscribed: true,
        plan: isStripeTrial ? "trial" : plan,
        tier,
        product_id: productId,
        subscription_end: subscriptionEnd,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("No active Stripe sub, checking trial");
    const trialResult = await checkTrial(supabaseClient, user.id, customerId);
    return new Response(JSON.stringify(trialResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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

async function checkTrial(supabaseClient: any, userId: string, stripeCustomerId?: string) {
  const { data: sub } = await supabaseClient
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (sub && sub.status === "trialing" && sub.trial_ends_at) {
    const trialEnd = new Date(sub.trial_ends_at);
    if (trialEnd > new Date()) {
      logStep("Trial active", { trial_ends_at: sub.trial_ends_at });
      return { subscribed: true, plan: "trial", tier: "local", subscription_end: sub.trial_ends_at };
    }
    logStep("Trial expired, setting inactive");
    await supabaseClient.from("subscriptions").update({ status: "inactive", plan: "free" }).eq("user_id", userId);
  } else if (!sub) {
    await supabaseClient.from("subscriptions").upsert({
      user_id: userId, plan: "free", status: "inactive",
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
    }, { onConflict: "user_id" });
  }

  return { subscribed: false, plan: "free", tier: null };
}
