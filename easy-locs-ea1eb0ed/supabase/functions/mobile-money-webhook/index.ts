import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const logStep = (step: string, details?: unknown) =>
  console.log(`[MOBILE-MONEY-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, verif-hash, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(withEdgeLogging("mobile-money-webhook", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const verifHash = req.headers.get("verif-hash");
    const expectedHash = Deno.env.get("FLUTTERWAVE_WEBHOOK_HASH");

    if (!expectedHash || verifHash !== expectedHash) {
      logStep("Invalid webhook hash");
      return new Response(JSON.stringify({ error: "Invalid hash" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    logStep("Webhook received", { event: payload.event, txRef: payload.data?.tx_ref });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const data = payload.data;
    if (!data) {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txRef = data.tx_ref;
    const status = data.status;
    const amount = data.amount;
    const currency = data.currency;
    const meta = data.meta || {};

    await supabase.from("payment_provider_events").insert({
      provider: "flutterwave",
      event_type: `mobile_money_${status}`,
      event_id: txRef || crypto.randomUUID(),
      payload_json: {
        flw_ref: data.flw_ref,
        tx_ref: txRef,
        status,
        amount,
        currency,
        phone_number: data.customer?.phone_number,
        user_id: meta.user_id,
        order_id: meta.order_id,
      },
    });

    if (status === "successful" && meta.user_id) {
      const { data: existingEvent } = await supabase
        .from("payment_provider_events")
        .select("id")
        .eq("provider", "flutterwave")
        .eq("event_id", txRef)
        .eq("event_type", "mobile_money_successful_processed")
        .maybeSingle();

      if (existingEvent) {
        logStep("Duplicate webhook event, skipping", { txRef });
        return new Response(JSON.stringify({ status: "ok", deduplicated: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("payment_provider_events").insert({
        provider: "flutterwave",
        event_type: "mobile_money_successful_processed",
        event_id: txRef,
        payload_json: { processed_at: new Date().toISOString() },
      });

      logStep("Payment successful", { userId: meta.user_id, amount, hasOrder: !!meta.order_id });

      if (meta.order_id) {
        await supabase
          .from("storefront_orders")
          .update({
            payment_status: "paid",
            payment_method: "mobile_money",
            paid_at: new Date().toISOString(),
          })
          .eq("id", meta.order_id);
        logStep("Order updated", { orderId: meta.order_id });
      } else {
        const { data: walletAccount } = await supabase
          .from("wallet_accounts")
          .select("id, balance")
          .eq("owner_user_id", meta.user_id)
          .eq("is_default", true)
          .maybeSingle();

        if (walletAccount) {
          await supabase
            .from("wallet_accounts")
            .update({ balance: (walletAccount.balance || 0) + amount })
            .eq("id", walletAccount.id);

          await supabase.from("wallet_ledger_entries").insert({
            wallet_account_id: walletAccount.id,
            type: "credit",
            amount,
            currency: currency || "XOF",
            description: `Mobile Money top-up via ${meta.provider || "mobile_money"}`,
            reference_type: "mobile_money",
            reference_id: txRef,
            status: "completed",
          });

          logStep("Wallet credited (top-up)", { walletId: walletAccount.id, amount });
        }
      }

      await supabase.from("notifications").insert({
        id: crypto.randomUUID(),
        user_id: meta.user_id,
        title: "Mobile Money Payment Confirmed",
        body: `${amount} ${currency} received via Mobile Money`,
        type: "wallet_mobile_money",
        read: false,
        metadata_json: { amount, currency, tx_ref: txRef, provider: meta.provider },
      });
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("Error", { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
