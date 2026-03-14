import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }
    const user = userData.user;
    logStep("User authenticated", { email: user.email });

    const body = await req.json();
    const rentCallId = body.rentCallId || body.rent_call_id;
    const paymentMethod = body.payment_method || "card";

    if (!rentCallId) {
      return new Response(JSON.stringify({ error: "Missing rent call ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }
    if (!["card", "sepa"].includes(paymentMethod)) {
      return new Response(JSON.stringify({ error: "Invalid payment method" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    logStep("Payment request", { rentCallId, paymentMethod });

    const { data: rentCall, error: rcError } = await supabaseClient
      .from("rent_calls")
      .select("id, paid, total_amount, rent_amount, charges_amount, month, tenant_id, org_id, property_id")
      .eq("id", rentCallId)
      .single();

    if (rcError || !rentCall) {
      return new Response(JSON.stringify({ error: "Appel de loyer introuvable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
      });
    }
    if (rentCall.paid) {
      return new Response(JSON.stringify({ error: "Ce loyer est déjà payé" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409,
      });
    }

    const amount = Number(rentCall.total_amount);
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Montant invalide" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const { data: tenant } = await supabaseClient
      .from("tenants")
      .select("name, tenant_user_id")
      .eq("id", rentCall.tenant_id)
      .single();

    const tenantName = tenant?.name || "Locataire";

    const isTenantPayer = !!tenant?.tenant_user_id && tenant.tenant_user_id === user.id;
    const { data: orgMembership } = await supabaseClient
      .from("org_members")
      .select("id")
      .eq("org_id", rentCall.org_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!isTenantPayer && !orgMembership) {
      return new Response(JSON.stringify({ error: "Unauthorized for this rent call" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
      });
    }

    const { data: org } = await supabaseClient
      .from("orgs")
      .select("stripe_account_id, stripe_onboarding_complete, country")
      .eq("id", rentCall.org_id)
      .single();

    const hasConnect = org?.stripe_account_id && org.stripe_onboarding_complete;
    logStep("Stripe Connect status", { hasConnect, accountId: org?.stripe_account_id || "none" });

    if (!hasConnect) {
      return new Response(JSON.stringify({ error: "Le bailleur n'a pas encore configuré son compte de paiement Stripe Connect." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 422,
      });
    }

    const stripeKey = (Deno.env.get("STRIPE_SECRET_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim();
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = "https://www.easy-locs.com";

    const currency = COUNTRY_CURRENCY[org?.country || "FR"] || "eur";
    const amountCents = Math.round(amount * 100);

    const useSepa = paymentMethod === "sepa" && currency === "eur";

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const sessionConfig: any = {
      mode: "payment",
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      customer_creation: customerId ? undefined : "always",
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
      ...(useSepa
        ? { payment_method_types: ["sepa_debit"] }
        : { payment_method_types: ["card", "link"] }
      ),
      locale: "auto",
      success_url: `${origin}/tenant/pay?payment=success&rent_call_id=${rentCallId}`,
      cancel_url: `${origin}/tenant/pay?payment=cancel`,
      metadata: {
        rent_call_id: rentCallId,
        org_id: rentCall.org_id,
        type: "rent_payment",
      },
    };

    sessionConfig.payment_intent_data = {
      transfer_data: {
        destination: org.stripe_account_id,
      },
      metadata: {
        rent_call_id: rentCallId,
        tenant_name: tenantName,
        month: rentCall.month || "",
      },
    };

    if (paymentMethod === "sepa" && currency === "eur") {
      sessionConfig.payment_intent_data = {
        ...sessionConfig.payment_intent_data,
        setup_future_usage: "off_session",
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    const paymentRef = `LOYER-${(rentCall.month || "").replace(/[^a-zA-Z0-9]/g, "")}-${rentCallId.slice(0, 8).toUpperCase()}`;
    await supabaseClient.from("rent_calls").update({
      payment_status: "processing",
      payment_method: paymentMethod === "sepa" ? "sepa_debit" : "card",
      payment_reference: paymentRef,
      stripe_payment_intent_id: session.payment_intent || null,
    }).eq("id", rentCallId);

    logStep("Checkout session created", { sessionId: session.id, currency, amount });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: "Payment error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
