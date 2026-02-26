import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[RENT-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Map country codes to Stripe currencies
const COUNTRY_CURRENCY: Record<string, string> = {
  FR: "eur", DE: "eur", ES: "eur", IT: "eur", PT: "eur", BE: "eur", NL: "eur",
  AT: "eur", IE: "eur", FI: "eur", LU: "eur", GR: "eur",
  GB: "gbp", US: "usd", CA: "cad", AU: "aud", CH: "chf",
  JP: "jpy", BR: "brl", MX: "mxn", IN: "inr", AE: "aed",
  MA: "mad", TN: "tnd", SN: "xof", CI: "xof",
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    const { rentCallId, amount, tenantName, month, orgId, payment_method } = await req.json();
    if (!rentCallId || !amount || !orgId) throw new Error("Missing required fields");
    logStep("Payment request", { rentCallId, amount, month, payment_method });

    // Get the landlord's connected Stripe account and country
    const { data: org } = await supabaseClient
      .from("orgs")
      .select("stripe_account_id, stripe_onboarding_complete, country")
      .eq("id", orgId)
      .single();

    if (!org?.stripe_account_id || !org.stripe_onboarding_complete) {
      throw new Error("Le propriétaire n'a pas encore configuré son compte de paiement");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://id-preview--6da2f25e-3ae3-4df2-a117-4c1c3de6faf8.lovable.app";

    // Determine currency based on org country
    const currency = COUNTRY_CURRENCY[org.country || "FR"] || "eur";
    const amountCents = Math.round(amount * 100);

    // Determine payment methods based on currency and user preference
    const paymentMethods: string[] = ["card"]; // card always includes Apple Pay & Google Pay via Stripe
    if (currency === "eur" && payment_method !== "card") {
      paymentMethods.push("sepa_debit");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: `Loyer ${month || ""}`,
              description: `Paiement du loyer pour ${tenantName || "locataire"}`,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_data: {
          destination: org.stripe_account_id,
        },
        metadata: {
          rent_call_id: rentCallId,
          tenant_name: tenantName || "",
          month: month || "",
        },
      },
      payment_method_types: paymentMethods as any,
      success_url: `${origin}/tenant/pay?payment=success&rent_call_id=${rentCallId}`,
      cancel_url: `${origin}/tenant/pay?payment=cancel`,
      metadata: {
        rent_call_id: rentCallId,
        org_id: orgId,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, currency });

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
