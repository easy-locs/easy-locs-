/**
 * payment-notification — Bank-style transaction notifications with payment location.
 * Called after successful payment webhook to create rich user notifications.
 *
 * POST body:
 *   { user_id, amount, currency, merchant_name, payment_type, location?, payment_intent_id }
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

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  try {
    const {
      user_id,
      amount,
      currency = "AED",
      merchant_name,
      payment_type = "payment",
      location,
      payment_intent_id,
      order_id,
    } = await req.json();

    if (!user_id || !amount) {
      return new Response(JSON.stringify({ error: "user_id and amount required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format amount
    const formattedAmount = `${Number(amount).toFixed(2)} ${currency}`;
    
    // Build notification title & body (bank-style)
    const typeLabels: Record<string, string> = {
      payment: "Payment Completed",
      topup: "Wallet Top Up",
      transfer: "Money Sent",
      receive: "Money Received",
      qr_payment: "QR Payment",
      refund: "Refund Processed",
    };

    const title = typeLabels[payment_type] || "Transaction Update";
    
    let body = `${formattedAmount}`;
    if (merchant_name) body += ` at ${merchant_name}`;
    if (location?.city) body += ` · ${location.city}`;
    if (location?.country) body += `, ${location.country}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    body += ` · ${timeStr}`;

    // Insert notification
    const { error: notifError } = await supabase.from("notifications").insert({
      id: crypto.randomUUID(),
      user_id,
      title,
      body,
      type: "wallet_" + payment_type,
      read: false,
      metadata_json: {
        amount,
        currency,
        merchant_name: merchant_name || null,
        payment_type,
        payment_intent_id: payment_intent_id || null,
        order_id: order_id || null,
        location: location || null,
        timestamp: now.toISOString(),
      },
    });

    if (notifError) {
      console.error("Notification insert error:", notifError);
    }

    // Also record in payment_provider_events for audit
    await supabase.from("payment_provider_events").insert({
      provider: "internal",
      event_type: "notification_sent",
      event_id: crypto.randomUUID(),
      payment_intent_id: payment_intent_id || null,
      payload_json: {
        user_id,
        title,
        body,
        payment_type,
        amount,
        currency,
      },
    });

    return new Response(JSON.stringify({ success: true, title, body }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("payment-notification error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
