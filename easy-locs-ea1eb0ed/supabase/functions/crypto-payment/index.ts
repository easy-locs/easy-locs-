import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";

const logStep = (step: string, details?: unknown) =>
  console.log(`[CRYPTO-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rlResult = await checkServerRateLimit(req, "crypto-payment");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const coinbaseApiKey = Deno.env.get("COINBASE_COMMERCE_API_KEY");
    if (!coinbaseApiKey) {
      return new Response(JSON.stringify({ error: "Crypto payment provider not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

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

    if (body.action === "status" && body.charge_id) {
      const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: creationEvent } = await supabaseAdmin
        .from("payment_provider_events")
        .select("payload_json")
        .eq("provider", "coinbase_commerce")
        .eq("event_id", body.charge_id)
        .eq("event_type", "charge_created")
        .maybeSingle();

      if (!creationEvent || creationEvent.payload_json?.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Charge not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
        });
      }

      logStep("Checking charge status", { chargeId: body.charge_id, userId: user.id });

      const statusRes = await fetch(
        `https://api.commerce.coinbase.com/charges/${body.charge_id}`,
        {
          headers: {
            "X-CC-Api-Key": coinbaseApiKey,
            "X-CC-Version": "2018-03-22",
          },
        }
      );
      const statusData = await statusRes.json();

      if (!statusRes.ok || !statusData.data) {
        return new Response(JSON.stringify({ error: "Failed to check charge status" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
        });
      }

      const timeline = statusData.data.timeline || [];
      const lastEvent = timeline[timeline.length - 1];
      let status = "pending";
      if (lastEvent?.status === "COMPLETED" || lastEvent?.status === "RESOLVED") {
        const expectedAmount = creationEvent.payload_json?.amount;
        const pricingLocal = statusData.data.pricing?.local;
        if (expectedAmount && pricingLocal && parseFloat(pricingLocal.amount) !== expectedAmount) {
          logStep("Amount mismatch in status check", {
            expected: expectedAmount, actual: pricingLocal.amount,
          });
          return new Response(
            JSON.stringify({ status: "failed", charge_id: body.charge_id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        status = "completed";
      } else if (lastEvent?.status === "EXPIRED" || lastEvent?.status === "CANCELED") {
        status = lastEvent.status.toLowerCase();
      } else if (lastEvent?.status === "UNRESOLVED") {
        status = "pending";
      }

      return new Response(
        JSON.stringify({ status, charge_id: body.charge_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { amount, currency, order_id, description } = body;

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    logStep("Creating Coinbase Commerce charge", { amount, currency, userId: user.id });

    const chargeResponse = await fetch("https://api.commerce.coinbase.com/charges", {
      method: "POST",
      headers: {
        "X-CC-Api-Key": coinbaseApiKey,
        "X-CC-Version": "2018-03-22",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: description || "Easy-Locs Payment",
        description: `Payment of ${amount} ${currency || "USD"}`,
        pricing_type: "fixed_price",
        local_price: {
          amount: String(amount),
          currency: (currency || "USD").toUpperCase(),
        },
        metadata: {
          user_id: user.id,
          order_id: order_id || "",
          source: "easy-locs",
        },
        redirect_url: `${Deno.env.get("SITE_URL") || "https://easy-locs.com"}/wallet?crypto=success`,
        cancel_url: `${Deno.env.get("SITE_URL") || "https://easy-locs.com"}/wallet?crypto=cancelled`,
      }),
    });

    const chargeData = await chargeResponse.json();

    if (!chargeResponse.ok || !chargeData.data) {
      throw new Error(chargeData.error?.message || "Failed to create crypto charge");
    }

    logStep("Charge created", { chargeId: chargeData.data.id });

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabaseAdmin.from("payment_provider_events").insert({
      provider: "coinbase_commerce",
      event_type: "charge_created",
      event_id: chargeData.data.id,
      payload_json: {
        user_id: user.id,
        amount,
        currency: currency || "USD",
        order_id: order_id || null,
        hosted_url: chargeData.data.hosted_url,
        expires_at: chargeData.data.expires_at,
      },
    });

    const addresses: Record<string, string> = {};
    if (chargeData.data.addresses) {
      for (const [network, address] of Object.entries(chargeData.data.addresses)) {
        addresses[network] = address as string;
      }
    }

    return new Response(
      JSON.stringify({
        charge_id: chargeData.data.id,
        hosted_url: chargeData.data.hosted_url,
        expires_at: chargeData.data.expires_at,
        addresses,
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
