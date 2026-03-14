import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Product ID → tier mapping
const PRODUCT_TIER_MAP: Record<string, string> = {
  // Solo
  "prod_U7umDIXfN7CQf2": "solo",
  "prod_U7unnsqliODBFg": "solo",
  // Team
  "prod_U7uoc9MNmkojax": "team",
  "prod_U7uotRXnfBtYj6": "team",
  // Company
  "prod_U7up10rqd4eQhA": "company",
  "prod_U7uqF0RSK8MZBk": "company",
  // Legacy — map to solo
  "prod_U37B1NPO4TQTnD": "solo",
  "prod_U37COZzTYiHqG1": "solo",
  "prod_U354fxGmmhSvn0": "solo",
  "prod_U355WIZ1brDxXV": "solo",
  "prod_U355aIW4nePfxQ": "solo",
  "prod_U355FFHHJ8rgAT": "solo",
  "prod_U2yLjzJN4Y7LYb": "solo",
  "prod_U2zlUjPtdVVjIw": "solo",
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
    const stripeKey = (Deno.env.get("STRIPE_SECRET_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim();
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header, returning free");
      return new Response(JSON.stringify({ subscribed: false, plan: "free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      logStep("Auth failed, returning free", { error: userError?.message });
      return new Response(JSON.stringify({ subscribed: false, plan: "free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;
    logStep("User authenticated", { email: user.email });

    // Check local subscriptions table first
    const { data: localSub } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (localSub && localSub.status === "active" && localSub.plan !== "free") {
      const subEnd = localSub.current_period_end || localSub.trial_ends_at;
      if (subEnd && new Date(subEnd) > new Date()) {
        logStep("Local active subscription found", { plan: localSub.plan, end: subEnd });
        return new Response(JSON.stringify({
          subscribed: true,
          plan: localSub.plan,
          subscription_end: subEnd,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Direct Stripe API test
    const testRes = await fetch("https://api.stripe.com/v1/customers?limit=1", {
      headers: { "Authorization": `Bearer ${stripeKey}` },
    });
    const testBody = await testRes.text();
    logStep("Direct Stripe test", { status: testRes.status });

    if (!testRes.ok) {
      throw new Error(`Stripe API error (${testRes.status}): ${testBody.substring(0, 200)}`);
    }

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
      const tier = PRODUCT_TIER_MAP[productId] || "solo";
      const isStripeTrial = activeSub.status === "trialing";

      logStep("Active subscription", { tier, subscriptionEnd, status: activeSub.status });

      await supabaseClient.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: activeSub.id,
        plan: tier,
        status: isStripeTrial ? "trialing" : "active",
        current_period_end: subscriptionEnd,
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({
        subscribed: true,
        plan: isStripeTrial ? "trial" : tier,
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
      return { subscribed: true, plan: "trial", subscription_end: sub.trial_ends_at };
    }
    logStep("Trial expired, setting inactive");
    await supabaseClient.from("subscriptions").update({ status: "inactive", plan: "free" }).eq("user_id", userId);
  } else if (!sub) {
    await supabaseClient.from("subscriptions").upsert({
      user_id: userId, plan: "free", status: "inactive",
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
    }, { onConflict: "user_id" });
  }

  return { subscribed: false, plan: "free" };
}
