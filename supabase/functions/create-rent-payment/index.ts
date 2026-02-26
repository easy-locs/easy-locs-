import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno&deno-std=0.190.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[RENT-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

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

    // Accept both naming conventions from frontend
    const body = await req.json();
    const rentCallId = body.rentCallId || body.rent_call_id;
    const paymentMethod = body.payment_method || "card";
    
    if (!rentCallId) throw new Error("Missing rent_call_id");
    logStep("Payment request", { rentCallId, paymentMethod });

    // Fetch rent call details from DB (no need for client to pass them)
    const { data: rentCall, error: rcError } = await supabaseClient
      .from("rent_calls")
      .select("id, total_amount, rent_amount, charges_amount, month, tenant_id, org_id, property_id")
      .eq("id", rentCallId)
      .single();

    if (rcError || !rentCall) throw new Error("Appel de loyer introuvable");
    if (rentCall.paid) throw new Error("Ce loyer est déjà payé");
    
    const amount = Number(rentCall.total_amount);
    if (!amount || amount <= 0) throw new Error("Montant invalide");

    // Fetch tenant name
    const { data: tenant } = await supabaseClient
      .from("tenants")
      .select("name")
      .eq("id", rentCall.tenant_id)
      .single();

    const tenantName = tenant?.name || "Locataire";

    // Get the landlord's connected Stripe account and country
    const { data: org } = await supabaseClient
      .from("orgs")
      .select("stripe_account_id, stripe_onboarding_complete, country")
      .eq("id", rentCall.org_id)
      .single();

    if (!org?.stripe_account_id || !org.stripe_onboarding_complete) {
      throw new Error("Le propriétaire n'a pas encore configuré son compte de paiement Stripe Connect");
    }

    const stripeKey = (Deno.env.get("STRIPE_SECRET_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim();
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    const origin = req.headers.get("origin") || "https://easy-loc.lovable.app";

    const currency = COUNTRY_CURRENCY[org.country || "FR"] || "eur";
    const amountCents = Math.round(amount * 100);

    const paymentMethods: string[] = ["card"];
    if (currency === "eur" && paymentMethod !== "card") {
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
              name: `Loyer ${rentCall.month || ""}`,
              description: `Paiement du loyer pour ${tenantName}`,
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
          tenant_name: tenantName,
          month: rentCall.month || "",
        },
      },
      payment_method_types: paymentMethods as any,
      success_url: `${origin}/tenant/pay?payment=success&rent_call_id=${rentCallId}`,
      cancel_url: `${origin}/tenant/pay?payment=cancel`,
      metadata: {
        rent_call_id: rentCallId,
        org_id: rentCall.org_id,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, currency, amount });

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
