import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { claimIdempotencyKey, finalizeIdempotencyKey } from "../_shared/idempotency.ts";

const logStep = (step: string, details?: unknown) =>
  console.log(`[CRYPTO-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cc-webhook-signature, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const payloadData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, payloadData);
    const computedHex = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedHex.length !== signature.length) return false;

    let mismatch = 0;
    for (let i = 0; i < computedHex.length; i++) {
      mismatch |= computedHex.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const webhookSecret = Deno.env.get("COINBASE_WEBHOOK_SECRET");
    const signature = req.headers.get("x-cc-webhook-signature");
    const rawBody = await req.text();

    if (!webhookSecret || !signature) {
      logStep("Missing webhook secret or signature");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      logStep("Webhook signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (!event) {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event received", { type: event.type, chargeId: event.data?.id });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const chargeData = event.data;
    const metadata = chargeData?.metadata || {};
    const userId = metadata.user_id;
    const orderId = metadata.order_id;
    const chargeId = chargeData?.id;

    await supabase.from("payment_provider_events").insert({
      provider: "coinbase_commerce",
      event_type: event.type,
      event_id: chargeId || crypto.randomUUID(),
      payload_json: {
        event_type: event.type,
        charge_id: chargeId,
        user_id: userId,
        order_id: orderId,
        payments: chargeData?.payments,
        timeline: chargeData?.timeline,
      },
    });

    if (event.type === "charge:confirmed" || event.type === "charge:completed") {
      const dedupeKey = `${chargeId}_${event.type}`;

      // Task #1004 — unified idempotency layer (claim + finalize).
      // Replays within the TTL never re-credit a wallet or re-mark an
      // order paid; failures release the claim so retries can proceed.
      const claim = await claimIdempotencyKey(
        supabase,
        "crypto-webhook",
        dedupeKey,
        { chargeId, type: event.type, userId, orderId },
        60 * 60 * 24 * 7, // 7d retention for payment dedup
      );

      if (!claim.isNew && claim.status === "succeeded") {
        logStep("Duplicate webhook event (replay), skipping", { chargeId, eventType: event.type });
        return new Response(JSON.stringify({ status: "ok", deduplicated: true, replayed: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!claim.isNew && claim.status === "pending") {
        logStep("In-flight webhook event, skipping", { chargeId, eventType: event.type });
        return new Response(JSON.stringify({ status: "in_flight", deduplicated: true }), {
          status: 202,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {

      // Best-effort secondary log in the existing audit table.
      await supabase.from("payment_provider_events").insert({
        provider: "coinbase_commerce",
        event_type: "crypto_processed",
        event_id: dedupeKey,
        payload_json: { processed_at: new Date().toISOString() },
      });

      logStep("Payment confirmed", { chargeId, userId });

      if (!userId) {
        logStep("No user_id in metadata, skipping wallet update");
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payments = chargeData?.payments || [];
      const confirmedPayment = payments.find((p: any) =>
        p.status === "CONFIRMED" || p.status === "COMPLETED"
      );

      const localPrice = chargeData?.pricing?.local;
      const amount = confirmedPayment
        ? parseFloat(confirmedPayment.value?.local?.amount || localPrice?.amount || "0")
        : parseFloat(localPrice?.amount || "0");
      const currency = localPrice?.currency || "USD";

      if (orderId) {
        await supabase
          .from("storefront_orders")
          .update({
            payment_status: "paid",
            payment_method: "crypto",
            paid_at: new Date().toISOString(),
          })
          .eq("id", orderId);
        logStep("Order updated", { orderId });
      } else if (amount > 0) {
        const { data: walletAccount } = await supabase
          .from("wallet_accounts")
          .select("id, balance")
          .eq("owner_user_id", userId)
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
            currency,
            description: `Crypto top-up confirmed (${chargeId})`,
            reference_type: "crypto",
            reference_id: chargeId,
            status: "completed",
          });

          logStep("Wallet credited (top-up)", { walletId: walletAccount.id, amount, currency });
        }
      }

      await supabase.from("notifications").insert({
        id: crypto.randomUUID(),
        user_id: userId,
        title: "Crypto Payment Confirmed",
        body: `${amount} ${currency} received via cryptocurrency`,
        type: "wallet_crypto",
        read: false,
        metadata_json: { amount, currency, charge_id: chargeId },
      });

        await finalizeIdempotencyKey(supabase, "crypto-webhook", dedupeKey, "succeeded", {
          chargeId, eventType: event.type, userId, orderId, amount, currency,
        });
      } catch (innerErr) {
        const innerMsg = innerErr instanceof Error ? innerErr.message : String(innerErr);
        await finalizeIdempotencyKey(supabase, "crypto-webhook", dedupeKey, "failed", { error: innerMsg });
        throw innerErr;
      }
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
});
