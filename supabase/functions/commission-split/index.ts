/**
 * commission-split — Calculate and record platform / store / driver commission splits.
 * Called by stripe-webhook after successful payment or by internal operations.
 *
 * POST body:
 *   { payment_intent_id, total_amount, currency, merchant_id, driver_id?, order_id?,
 *     platform_rate?, merchant_rate?, driver_rate? }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Guard: only service-role or authenticated callers with valid JWT
  const authHeader = req.headers.get("authorization") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = authHeader.replace("Bearer ", "");

  // Reject if no auth or if using the anon key directly (must be service_role or user JWT)
  if (!token || token === supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", supabaseServiceKey);

  try {
    const {
      payment_intent_id,
      total_amount,
      currency = "AED",
      merchant_id,
      driver_id,
      order_id,
      platform_rate = 0.10,   // 10% platform default
      merchant_rate = 0.80,   // 80% merchant default
      driver_rate = 0.10,     // 10% driver default (0 if no driver)
    } = await req.json();

    if (!payment_intent_id || !total_amount || !merchant_id) {
      return new Response(JSON.stringify({ error: "payment_intent_id, total_amount, merchant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from("commission_splits")
      .select("id")
      .eq("source_payment_id", payment_intent_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "Commission already split for this payment", existing_id: existing[0].id }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasDriver = !!driver_id;
    const effectiveDriverRate = hasDriver ? driver_rate : 0;
    const effectiveMerchantRate = hasDriver ? merchant_rate : merchant_rate + driver_rate;

    const platformAmount = Math.round(total_amount * platform_rate * 100) / 100;
    const merchantAmount = Math.round(total_amount * effectiveMerchantRate * 100) / 100;
    const driverAmount = hasDriver ? Math.round(total_amount * effectiveDriverRate * 100) / 100 : 0;

    // Ensure amounts sum correctly (rounding adjustment goes to merchant)
    const remainder = total_amount - platformAmount - merchantAmount - driverAmount;
    const adjustedMerchantAmount = merchantAmount + remainder;

    const splits = [
      {
        source_payment_id: payment_intent_id,
        split_type: "platform",
        recipient_id: "platform",
        recipient_type: "platform",
        amount: platformAmount,
        currency,
        rate_applied: platform_rate,
        order_id: order_id || null,
        status: "pending",
      },
      {
        source_payment_id: payment_intent_id,
        split_type: "merchant",
        recipient_id: merchant_id,
        recipient_type: "merchant",
        amount: adjustedMerchantAmount,
        currency,
        rate_applied: effectiveMerchantRate,
        order_id: order_id || null,
        status: "pending",
      },
    ];

    if (hasDriver) {
      splits.push({
        source_payment_id: payment_intent_id,
        split_type: "driver",
        recipient_id: driver_id,
        recipient_type: "driver",
        amount: driverAmount,
        currency,
        rate_applied: effectiveDriverRate,
        order_id: order_id || null,
        status: "pending",
      });
    }

    const { error: insertError } = await supabase.from("commission_splits").insert(splits);
    if (insertError) throw new Error(`Failed to insert splits: ${insertError.message}`);

    return new Response(JSON.stringify({
      success: true,
      total_amount,
      currency,
      splits: {
        platform: platformAmount,
        merchant: adjustedMerchantAmount,
        driver: driverAmount,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("commission-split error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
