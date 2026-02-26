import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const PRODUCT_MAP: Record<string, string> = {
  "prod_U37B1NPO4TQTnD": "unlimited_monthly",
  "prod_U37COZzTYiHqG1": "unlimited_annual",
  "prod_U354fxGmmhSvn0": "unlimited_monthly",
  "prod_U355WIZ1brDxXV": "unlimited_annual",
  "prod_U355aIW4nePfxQ": "unlimited_monthly",
  "prod_U355FFHHJ8rgAT": "unlimited_annual",
  "prod_U2yLjzJN4Y7LYb": "unlimited_monthly",
  "prod_U2zlUjPtdVVjIw": "unlimited_annual",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    logStep("Missing signature or webhook secret");
    return new Response(JSON.stringify({ error: "Missing signature or webhook secret" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    logStep("Event received", { type: event.type, id: event.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("Signature verification failed", { error: msg });
    return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${msg}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, stripe, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, stripe, subscription);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          logStep("Invoice paid, refreshing subscription", { subscriptionId: invoice.subscription });
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await handleSubscriptionChange(supabase, stripe, sub);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { customer: invoice.customer, subscription: invoice.subscription });
        if (invoice.customer) {
          const userId = await getUserIdByCustomerId(supabase, stripe, invoice.customer as string);
          if (userId) {
            await supabase
              .from("subscriptions")
              .update({ status: "past_due" })
              .eq("user_id", userId);
            logStep("Set subscription to past_due", { userId });
          }
        }
        break;
      }
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing event", { error: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleSubscriptionChange(
  supabase: any,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByCustomerId(supabase, stripe, customerId);
  if (!userId) {
    logStep("No user found for customer", { customerId });
    return;
  }

  const productId = subscription.items.data[0]?.price?.product as string;
  const plan = PRODUCT_MAP[productId] || "unlimited_monthly";
  const status = subscription.status === "trialing" ? "trialing" : subscription.status === "active" ? "active" : subscription.status;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan,
      status,
      current_period_end: currentPeriodEnd,
    },
    { onConflict: "user_id" }
  );

  logStep("Subscription synced", { userId, plan, status, currentPeriodEnd });
}

async function handleSubscriptionDeleted(
  supabase: any,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByCustomerId(supabase, stripe, customerId);
  if (!userId) {
    logStep("No user found for deleted subscription", { customerId });
    return;
  }

  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      plan: "free",
      stripe_subscription_id: null,
    })
    .eq("user_id", userId);

  logStep("Subscription canceled", { userId });
}

async function getUserIdByCustomerId(
  supabase: any,
  stripe: Stripe,
  customerId: string
): Promise<string | null> {
  // First try to find in subscriptions table
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .limit(1)
    .maybeSingle();

  if (sub?.user_id) return sub.user_id;

  // Fallback: get email from Stripe customer, match in profiles
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) return null;
    const email = (customer as Stripe.Customer).email;
    if (!email) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    return profile?.id || null;
  } catch {
    return null;
  }
}
