import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";

const logStep = (step: string, details?: unknown) =>
  console.log(`[MOBILE-MONEY-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rlResult = await checkServerRateLimit(req, "mobile-money-payment");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const flutterwaveKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");

    if (!flutterwaveKey) {
      return new Response(JSON.stringify({ error: "Mobile Money provider not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503,
      });
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const body = await req.json();

    if (body.action === "status" && body.tx_ref) {
      const flwKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
      if (!flwKey) {
        return new Response(JSON.stringify({ error: "Provider not configured" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503,
        });
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: initiationEvent } = await supabaseAdmin
        .from("payment_provider_events")
        .select("payload_json")
        .eq("provider", "flutterwave")
        .eq("event_id", body.tx_ref)
        .eq("event_type", "mobile_money_initiated")
        .maybeSingle();

      if (!initiationEvent || initiationEvent.payload_json?.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Transaction not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
        });
      }

      logStep("Checking payment status", { txRef: body.tx_ref, userId: user.id });

      const verifyRes = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(body.tx_ref)}`,
        { headers: { Authorization: `Bearer ${flwKey}` } }
      );
      const verifyData = await verifyRes.json();

      let status = "pending";
      if (verifyData.status === "success" && verifyData.data?.status === "successful") {
        const expectedAmount = initiationEvent.payload_json?.amount;
        const expectedCurrency = initiationEvent.payload_json?.currency;
        if (
          expectedAmount && verifyData.data.amount !== expectedAmount ||
          expectedCurrency && verifyData.data.currency?.toUpperCase() !== expectedCurrency?.toUpperCase()
        ) {
          logStep("Amount/currency mismatch in status check", {
            expected: { amount: expectedAmount, currency: expectedCurrency },
            actual: { amount: verifyData.data.amount, currency: verifyData.data.currency },
          });
          return new Response(
            JSON.stringify({ status: "failed", message: "Payment verification failed" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        status = "completed";
      } else if (verifyData.data?.status === "failed") {
        status = "failed";
      }

      return new Response(
        JSON.stringify({ status, message: verifyData.data?.processor_response || verifyData.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { provider, phone_number, amount, currency, order_id } = body;

    if (!provider || !phone_number || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Missing required fields: provider, phone_number, amount" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    logStep("Initiating Mobile Money payment", { provider, phone_number, amount, currency });

    const txRef = `MM-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const providerTypeMap: Record<string, string> = {
      mpesa: "mpesa",
      orange_money: "francophone",
      wave: "francophone",
    };

    const currencyMap: Record<string, string> = {
      mpesa: currency || "KES",
      orange_money: currency || "XOF",
      wave: currency || "XOF",
    };

    const flwResponse = await fetch("https://api.flutterwave.com/v3/charges?type=mobile_money_" + (providerTypeMap[provider] || "francophone"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${flutterwaveKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency: currencyMap[provider] || currency || "XOF",
        phone_number,
        email: user.email || `${user.id}@easy-locs.com`,
        fullname: user.user_metadata?.full_name || "Easy-Locs User",
        meta: {
          user_id: user.id,
          order_id: order_id || "",
          provider,
        },
      }),
    });

    const flwData = await flwResponse.json();
    logStep("Flutterwave response", { status: flwData.status, message: flwData.message });

    if (flwData.status !== "success") {
      throw new Error(flwData.message || "Mobile Money initiation failed");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    await supabaseAdmin.from("payment_provider_events").insert({
      provider: "flutterwave",
      event_type: "mobile_money_initiated",
      event_id: txRef,
      payload_json: {
        user_id: user.id,
        provider,
        phone_number,
        amount,
        currency: currencyMap[provider] || currency,
        order_id: order_id || null,
        flw_ref: flwData.data?.flw_ref || null,
      },
    });

    return new Response(
      JSON.stringify({
        transaction_ref: txRef,
        flw_ref: flwData.data?.flw_ref,
        status: "pending",
        message: flwData.data?.processor_response || "Check your phone to approve the payment",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
