import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno&deno-std=0.190.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Valid price IDs — single unlimited plan
const VALID_PRICES = [
  "price_1T50xQKcrlZX0EnnpjDZb41W", // unlimited monthly 9.99€
  "price_1T50xgKcrlZX0EnntbHkjEsC", // unlimited annual 99€
  // Legacy prices (still valid for existing subscribers)
  "price_1T4yukKcrlZX0EnnBHZvH0kN",
  "price_1T4yuyKcrlZX0EnnLJIFwgnQ",
  "price_1T4yvUKcrlZX0Enn8RaH9jGK",
  "price_1T4yvmKcrlZX0EnndLXibrTC",
  "price_1T4sOdKcrlZX0EnnHIgwXcq9",
  "price_1T4tliKcrlZX0EnnxHeOxHIO",
];

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    const { priceId } = await req.json();
    if (!priceId || !VALID_PRICES.includes(priceId)) {
      throw new Error(`Invalid priceId: ${priceId}`);
    }
    logStep("Price ID", { priceId });

    const stripe = new Stripe((Deno.env.get("STRIPE_SECRET_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim(), { apiVersion: "2024-12-18.acacia" });
    
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer", { customerId });
    }

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/+$/, "") || "https://www.easy-locs.com";
    
    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard/billing?success=true`,
      cancel_url: `${origin}/dashboard/billing?canceled=true`,
      allow_promotion_codes: true,
      payment_method_types: ["card"],
    };
    
    if (!customerId) {
      sessionParams.subscription_data = { trial_period_days: 3 };
      logStep("Adding 3-day trial for new customer");
    }
    
    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
