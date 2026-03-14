import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[COLLECT-SEPA] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const cronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");

    if (cronSecret) {
      const { data: config } = await supabase
        .from("internal_config")
        .select("value")
        .eq("key", "x-cron-secret")
        .single();
      if (!config || config.value !== cronSecret) {
        return new Response(JSON.stringify({ error: "Invalid cron secret" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
        });
      }
    } else if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { error } = await supabase.auth.getUser(token);
      if (error) {
        return new Response(JSON.stringify({ error: "Authentication failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    logStep("Processing month", { month: currentMonth });

    const { data: unpaidCalls, error: fetchError } = await supabase
      .from("rent_calls")
      .select("id, tenant_id, org_id, total_amount, property_id")
      .eq("month", currentMonth)
      .eq("paid", false);

    if (fetchError) {
      return new Response(JSON.stringify({ error: `Fetch error: ${fetchError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
      });
    }
    if (!unpaidCalls || unpaidCalls.length === 0) {
      logStep("No unpaid rent calls for this month");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No unpaid rents" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found unpaid rent calls", { count: unpaidCalls.length });

    let collected = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const call of unpaidCalls) {
      try {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("email, name, stripe_customer_id")
          .eq("id", call.tenant_id)
          .single();

        if (!tenant?.email) {
          logStep("No email for tenant", { tenantId: call.tenant_id });
          failed++;
          continue;
        }

        const { data: org } = await supabase
          .from("orgs")
          .select("stripe_account_id, stripe_onboarding_complete")
          .eq("id", call.org_id)
          .single();

        if (!org?.stripe_account_id || !org.stripe_onboarding_complete) {
          logStep("No Stripe Connect for org", { orgId: call.org_id });
          failed++;
          continue;
        }

        let customerId = tenant.stripe_customer_id;

        if (!customerId) {
          const customers = await stripe.customers.list(
            { email: tenant.email, limit: 1 },
            { stripeAccount: org.stripe_account_id }
          );
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
          }
        }

        if (!customerId) {
          logStep("No Stripe customer found for tenant", { email: tenant.email });
          failed++;
          continue;
        }

        const paymentMethods = await stripe.paymentMethods.list(
          { customer: customerId, type: "sepa_debit", limit: 1 },
          { stripeAccount: org.stripe_account_id }
        );

        if (paymentMethods.data.length === 0) {
          logStep("No SEPA payment method for tenant", { email: tenant.email });
          failed++;
          continue;
        }

        const pmId = paymentMethods.data[0].id;
        const amountCents = Math.round(call.total_amount * 100);

        const pi = await stripe.paymentIntents.create(
          {
            amount: amountCents,
            currency: "eur",
            customer: customerId,
            payment_method: pmId,
            off_session: true,
            confirm: true,
            description: `Loyer ${currentMonth} — ${tenant.name || tenant.email}`,
            metadata: {
              rent_call_id: call.id,
              tenant_id: call.tenant_id,
              org_id: call.org_id,
              month: currentMonth,
              type: "rent_sepa_auto",
            },
          },
          { stripeAccount: org.stripe_account_id }
        );

        if (pi.status === "succeeded" || pi.status === "processing") {
          await supabase
            .from("rent_calls")
            .update({
              paid: true,
              paid_date: new Date().toISOString().split("T")[0],
              payment_method: "sepa_auto",
            })
            .eq("id", call.id);

          collected++;
          logStep("Payment initiated", { tenantEmail: tenant.email, amount: call.total_amount, piStatus: pi.status });
        } else {
          logStep("Payment not succeeded", { status: pi.status, tenantEmail: tenant.email });
          failed++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logStep("Payment error", { tenantId: call.tenant_id, error: msg });
        errors.push(`${call.tenant_id}: ${msg}`);
        failed++;
      }
    }

    logStep("Collection complete", { collected, failed, total: unpaidCalls.length });

    return new Response(
      JSON.stringify({ success: true, collected, failed, total: unpaidCalls.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: "Collection failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
