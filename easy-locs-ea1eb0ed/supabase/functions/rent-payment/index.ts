import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const COUNTRY_CURRENCY: Record<string, string> = {
  FR: "eur", DE: "eur", ES: "eur", IT: "eur", PT: "eur", BE: "eur", NL: "eur",
  AT: "eur", IE: "eur", FI: "eur", LU: "eur", GR: "eur",
  GB: "gbp", US: "usd", CA: "cad", AU: "aud", CH: "chf",
  JP: "jpy", BR: "brl", MX: "mxn", IN: "inr", AE: "aed",
  MA: "mad", TN: "tnd", SN: "xof", CI: "xof",
};

const log = (step: string, details?: unknown) =>
  console.log(`[RENT-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

Deno.serve(withEdgeLogging("rent-payment", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "rent-payment");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const body = await req.json();
    const mode: string = body.mode;

    if (!mode || !["checkout", "schedule"].includes(mode)) {
      return new Response(
        JSON.stringify({ error: "Invalid mode. Use 'checkout' or 'schedule'." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (mode === "checkout") {
      return await handleCheckout(authHeader, body);
    } else {
      return await handleSchedule(authHeader, body);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    log("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}));

async function handleCheckout(authHeader: string, body: Record<string, unknown>): Promise<Response> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.email) {
    return new Response(JSON.stringify({ error: "Authentication failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
    });
  }
  const user = userData.user;
  log("User authenticated", { email: user.email });

  const rentCallId = body.rentCallId || body.rent_call_id;
  const paymentMethod = (body.payment_method as string) || "card";

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

  log("Checkout request", { rentCallId, paymentMethod });

  const { data: rentCall, error: rcError } = await supabase
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

  const { data: tenant } = await supabase
    .from("tenants").select("name, tenant_user_id").eq("id", rentCall.tenant_id).single();

  const tenantName = tenant?.name || "Locataire";
  const isTenantPayer = !!tenant?.tenant_user_id && tenant.tenant_user_id === user.id;
  const { data: orgMembership } = await supabase
    .from("org_members").select("id")
    .eq("org_id", rentCall.org_id).eq("user_id", user.id).maybeSingle();

  if (!isTenantPayer && !orgMembership) {
    return new Response(JSON.stringify({ error: "Unauthorized for this rent call" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
    });
  }

  const { data: org } = await supabase
    .from("orgs").select("stripe_account_id, stripe_onboarding_complete, country")
    .eq("id", rentCall.org_id).single();

  const hasConnect = org?.stripe_account_id && org.stripe_onboarding_complete;
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

  const sessionConfig: Record<string, unknown> = {
    mode: "payment",
    customer: customerId,
    customer_email: customerId ? undefined : user.email,
    customer_creation: customerId ? undefined : "always",
    line_items: [{
      price_data: {
        currency,
        unit_amount: amountCents,
        product_data: {
          name: `Loyer ${rentCall.month || ""}`,
          description: `Paiement du loyer pour ${tenantName}`,
        },
      },
      quantity: 1,
    }],
    ...(useSepa ? { payment_method_types: ["sepa_debit"] } : { payment_method_types: ["card", "link"] }),
    locale: "auto",
    success_url: `${origin}/wallet/hub?payment=success&rent_call_id=${rentCallId}`,
    cancel_url: `${origin}/wallet/hub?payment=cancel`,
    metadata: { rent_call_id: rentCallId, org_id: rentCall.org_id, type: "rent_payment" },
    payment_intent_data: {
      transfer_data: { destination: org.stripe_account_id },
      metadata: { rent_call_id: rentCallId, tenant_name: tenantName, month: rentCall.month || "" },
      ...(useSepa ? { setup_future_usage: "off_session" } : {}),
    },
  };

  const session = await stripe.checkout.sessions.create(sessionConfig as Parameters<typeof stripe.checkout.sessions.create>[0]);

  const paymentRef = `LOYER-${(rentCall.month || "").replace(/[^a-zA-Z0-9]/g, "")}-${String(rentCallId).slice(0, 8).toUpperCase()}`;
  await supabase.from("rent_calls").update({
    payment_status: "processing",
    payment_method: paymentMethod === "sepa" ? "sepa_debit" : "card",
    payment_reference: paymentRef,
    stripe_payment_intent_id: session.payment_intent || null,
  }).eq("id", rentCallId);

  log("Checkout session created", { sessionId: session.id, currency, amount });
  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
  });
}

async function handleSchedule(authHeader: string, body: Record<string, unknown>): Promise<Response> {
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) throw new Error("Not authenticated");
  const userId = user.id;

  const { leaseId, dueDate, reference } = body as { leaseId: string; dueDate: string; reference?: string };

  const { data: ownerOrbit } = await admin
    .from("orbit_profiles_v2").select("*").eq("id", userId).single();

  const { data: lease } = await admin
    .from("leases").select("*").eq("id", leaseId).single();

  if (!lease) throw new Error("Lease not found");
  if (lease.owner_orbit_id !== ownerOrbit.orbit_id) throw new Error("Not allowed");

  const now = new Date().toISOString();
  const paymentId = crypto.randomUUID();

  const payment = {
    id: paymentId,
    lease_id: lease.id,
    property_id: lease.property_id,
    org_id: lease.org_id,
    tenant_id: lease.tenant_id,
    amount: lease.rent_amount,
    currency: lease.currency ?? "AED",
    due_date: dueDate,
    status: "pending",
    reference: reference ?? null,
    created_at: now,
    updated_at: now,
  };

  const { data: created, error: pErr } = await admin
    .from("rent_calls").insert(payment).select().single();
  if (pErr) throw pErr;

  await admin.from("notifications").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    type: "rent",
    title: "Rent payment created",
    body: `Payment ${paymentId} scheduled for ${dueDate}`,
    read: false,
    metadata_json: { paymentId, leaseId },
  });

  log("Payment record created", { paymentId, leaseId, dueDate });
  return new Response(
    JSON.stringify({ payment: created }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}
