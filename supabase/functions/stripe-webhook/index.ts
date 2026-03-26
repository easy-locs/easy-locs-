import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const PRODUCT_MAP: Record<string, string> = {
  "prod_U37B1NPO4TQTnD": "unlimited_monthly",
  "prod_U37COZzTYiHqG1": "unlimited_annual",
  "prod_U354fxGmmhSvn0": "unlimited_monthly",
  "prod_U355WIZ1brDxXV": "unlimited_annual",
  "prod_U355aIW4nePfxQ": "unlimited_monthly",
  "prod_U355FFHHJ8rgAT": "unlimited_annual",
  "prod_U2yLjzJN4Y7LYb": "unlimited_monthly",
  "prod_U2zlUjPtdVVjIw": "unlimited_annual",
};

/** Country → locale mapping for localized emails */
const COUNTRY_LOCALE: Record<string, { lang: string; currency: string; currencySymbol: string }> = {
  FR: { lang: "fr", currency: "EUR", currencySymbol: "€" },
  ES: { lang: "es", currency: "EUR", currencySymbol: "€" },
  DE: { lang: "de", currency: "EUR", currencySymbol: "€" },
  IT: { lang: "it", currency: "EUR", currencySymbol: "€" },
  PT: { lang: "pt", currency: "EUR", currencySymbol: "€" },
  GB: { lang: "en", currency: "GBP", currencySymbol: "£" },
  US: { lang: "en", currency: "USD", currencySymbol: "$" },
  CH: { lang: "fr", currency: "CHF", currencySymbol: "CHF" },
  BE: { lang: "fr", currency: "EUR", currencySymbol: "€" },
  LU: { lang: "fr", currency: "EUR", currencySymbol: "€" },
  NL: { lang: "en", currency: "EUR", currencySymbol: "€" },
  AT: { lang: "de", currency: "EUR", currencySymbol: "€" },
  IE: { lang: "en", currency: "EUR", currencySymbol: "€" },
  MA: { lang: "fr", currency: "MAD", currencySymbol: "MAD" },
  TN: { lang: "fr", currency: "TND", currencySymbol: "TND" },
};

const emailStrings: Record<string, Record<string, string>> = {
  fr: {
    rentPaidTitle: "💰 Loyer payé",
    rentPaidMsg: "{tenant} a payé {amount}{symbol} pour {month}.",
    paymentConfirmedTitle: "✅ Paiement confirmé",
    paymentConfirmedMsg: "Votre paiement de {amount}{symbol} pour {month} a été reçu. Votre quittance est disponible.",
    receiptTitle: "Quittance de loyer — {month}",
    bookingPaidTitle: "💳 Paiement reçu — réservation confirmée",
    bookingPaidMsg: "{guest} a payé {amount}{symbol} pour {listing} ({checkin} → {checkout}). Les dates sont bloquées.",
    bookingConfirmedTitle: "✅ Paiement confirmé",
    bookingConfirmedGreeting: "Bonjour {name},",
    bookingConfirmedBody: "Votre paiement de <strong>{amount} {currency}</strong> a été reçu. Votre réservation est confirmée :",
    arrival: "Arrivée", departure: "Départ", duration: "Durée",
    nightsSuffix: "nuit", nightsSuffixPlural: "nuits",
    footer: "EASY-LOCS® — Gestion locative intelligente",
  },
  en: {
    rentPaidTitle: "💰 Rent paid",
    rentPaidMsg: "{tenant} paid {amount}{symbol} for {month}.",
    paymentConfirmedTitle: "✅ Payment confirmed",
    paymentConfirmedMsg: "Your payment of {amount}{symbol} for {month} has been received. Your receipt is available.",
    receiptTitle: "Rent receipt — {month}",
    bookingPaidTitle: "💳 Payment received — booking confirmed",
    bookingPaidMsg: "{guest} paid {amount}{symbol} for {listing} ({checkin} → {checkout}). Dates are blocked.",
    bookingConfirmedTitle: "✅ Payment confirmed",
    bookingConfirmedGreeting: "Hello {name},",
    bookingConfirmedBody: "Your payment of <strong>{amount} {currency}</strong> has been received. Your booking is confirmed:",
    arrival: "Check-in", departure: "Check-out", duration: "Duration",
    nightsSuffix: "night", nightsSuffixPlural: "nights",
    footer: "EASY-LOCS® — Smart property management",
  },
  es: {
    rentPaidTitle: "💰 Alquiler pagado",
    rentPaidMsg: "{tenant} ha pagado {amount}{symbol} por {month}.",
    paymentConfirmedTitle: "✅ Pago confirmado",
    paymentConfirmedMsg: "Su pago de {amount}{symbol} por {month} ha sido recibido. Su recibo está disponible.",
    receiptTitle: "Recibo de alquiler — {month}",
    bookingPaidTitle: "💳 Pago recibido — reserva confirmada",
    bookingPaidMsg: "{guest} ha pagado {amount}{symbol} por {listing} ({checkin} → {checkout}). Las fechas están bloqueadas.",
    bookingConfirmedTitle: "✅ Pago confirmado",
    bookingConfirmedGreeting: "Hola {name},",
    bookingConfirmedBody: "Su pago de <strong>{amount} {currency}</strong> ha sido recibido. Su reserva está confirmada:",
    arrival: "Llegada", departure: "Salida", duration: "Duración",
    nightsSuffix: "noche", nightsSuffixPlural: "noches",
    footer: "EASY-LOCS® — Gestión inmobiliaria inteligente",
  },
  de: {
    rentPaidTitle: "💰 Miete bezahlt",
    rentPaidMsg: "{tenant} hat {amount}{symbol} für {month} bezahlt.",
    paymentConfirmedTitle: "✅ Zahlung bestätigt",
    paymentConfirmedMsg: "Ihre Zahlung von {amount}{symbol} für {month} wurde empfangen. Ihre Quittung ist verfügbar.",
    receiptTitle: "Mietquittung — {month}",
    bookingPaidTitle: "💳 Zahlung erhalten — Buchung bestätigt",
    bookingPaidMsg: "{guest} hat {amount}{symbol} für {listing} ({checkin} → {checkout}) bezahlt. Daten sind blockiert.",
    bookingConfirmedTitle: "✅ Zahlung bestätigt",
    bookingConfirmedGreeting: "Hallo {name},",
    bookingConfirmedBody: "Ihre Zahlung von <strong>{amount} {currency}</strong> wurde empfangen. Ihre Buchung ist bestätigt:",
    arrival: "Anreise", departure: "Abreise", duration: "Dauer",
    nightsSuffix: "Nacht", nightsSuffixPlural: "Nächte",
    footer: "EASY-LOCS® — Intelligente Immobilienverwaltung",
  },
  it: {
    rentPaidTitle: "💰 Affitto pagato",
    rentPaidMsg: "{tenant} ha pagato {amount}{symbol} per {month}.",
    paymentConfirmedTitle: "✅ Pagamento confermato",
    paymentConfirmedMsg: "Il pagamento di {amount}{symbol} per {month} è stato ricevuto. La ricevuta è disponibile.",
    receiptTitle: "Ricevuta di affitto — {month}",
    bookingPaidTitle: "💳 Pagamento ricevuto — prenotazione confermata",
    bookingPaidMsg: "{guest} ha pagato {amount}{symbol} per {listing} ({checkin} → {checkout}). Le date sono bloccate.",
    bookingConfirmedTitle: "✅ Pagamento confermato",
    bookingConfirmedGreeting: "Ciao {name},",
    bookingConfirmedBody: "Il pagamento di <strong>{amount} {currency}</strong> è stato ricevuto. La prenotazione è confermata:",
    arrival: "Arrivo", departure: "Partenza", duration: "Durata",
    nightsSuffix: "notte", nightsSuffixPlural: "notti",
    footer: "EASY-LOCS® — Gestione immobiliare intelligente",
  },
  pt: {
    rentPaidTitle: "💰 Aluguel pago",
    rentPaidMsg: "{tenant} pagou {amount}{symbol} por {month}.",
    paymentConfirmedTitle: "✅ Pagamento confirmado",
    paymentConfirmedMsg: "Seu pagamento de {amount}{symbol} por {month} foi recebido. Seu recibo está disponível.",
    receiptTitle: "Recibo de aluguel — {month}",
    bookingPaidTitle: "💳 Pagamento recebido — reserva confirmada",
    bookingPaidMsg: "{guest} pagou {amount}{symbol} por {listing} ({checkin} → {checkout}). As datas estão bloqueadas.",
    bookingConfirmedTitle: "✅ Pagamento confirmado",
    bookingConfirmedGreeting: "Olá {name},",
    bookingConfirmedBody: "Seu pagamento de <strong>{amount} {currency}</strong> foi recebido. Sua reserva está confirmada:",
    arrival: "Chegada", departure: "Saída", duration: "Duração",
    nightsSuffix: "noite", nightsSuffixPlural: "noites",
    footer: "EASY-LOCS® — Gestão imobiliária inteligente",
  },
};

function getLocale(country: string) {
  const cfg = COUNTRY_LOCALE[country] || COUNTRY_LOCALE.FR;
  const strings = emailStrings[cfg.lang] || emailStrings.fr;
  return { ...cfg, strings };
}

function tpl(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe((Deno.env.get("STRIPE_SECRET_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim(), {
    apiVersion: "2024-12-18.acacia",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    logStep("Missing signature or webhook secret");
    return new Response(JSON.stringify({ error: "Missing signature or webhook secret" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    logStep("Event received", { type: event.type, id: event.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("Signature verification failed", { error: msg });
    return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${msg}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, stripe, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, stripe, subscription);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          logStep("Invoice paid, refreshing subscription", { subscriptionId: invoice.subscription });
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await handleSubscriptionChange(supabase, stripe, sub);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { customer: invoice.customer, subscription: invoice.subscription });
        if (invoice.customer) {
          const userId = await getUserIdByCustomerId(supabase, stripe, invoice.customer as string);
          if (userId) {
            await supabase.from("subscriptions").update({ status: "past_due" }).eq("user_id", userId);
            logStep("Set subscription to past_due", { userId });
          }
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, stripe, session);
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = pi.metadata || {};
        if (meta.type === "rent_payment" && meta.rent_call_id) {
          logStep("PaymentIntent succeeded for rent", { rentCallId: meta.rent_call_id });
          await handleRentPayment(supabase, meta, { payment_intent: pi.id } as any);
        } else if (meta.type === "seasonal_booking" && meta.booking_request_id) {
          logStep("PaymentIntent succeeded for booking", { bookingRequestId: meta.booking_request_id });
          await handleBookingPayment(supabase, meta, { payment_intent: pi.id } as any);
        } else if (meta.type === "marketplace_booking" && meta.marketplace_booking_id) {
          logStep("PaymentIntent succeeded for marketplace booking", { bookingId: meta.marketplace_booking_id });
          await handleMarketplacePayment(supabase, meta, pi.id);
        }

        // ── Canonical post-payment automation ──
        await runPostPaymentAutomation(supabase, pi, meta);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = pi.metadata || {};
        if (meta.type === "rent_payment" && meta.rent_call_id) {
          logStep("PaymentIntent failed for rent", { rentCallId: meta.rent_call_id });
          await supabase.from("rent_calls").update({
            payment_status: "failed",
          }).eq("id", meta.rent_call_id);
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};
        if (meta.type === "orbit_payment" && meta.user_id) {
          logStep("Orbit payment session expired", { sessionId: session.id });
          // Mark unified wallet transaction as failed
          await supabase
            .from("unified_wallet_transactions")
            .update({ status: "failed" })
            .eq("context_id", session.id)
            .eq("sender_id", meta.user_id)
            .eq("status", "pending");
          // Audit
          await supabase.from("audit_logs").insert({
            user_id: meta.user_id,
            action: "orbit_payment_fiat_expired",
            metadata_json: { session_id: session.id, amount: meta.amount, currency: meta.currency },
          });
          // Post failure message in chat
          if (meta.thread_id) {
            const { data: thread } = await supabase.from("conversations_v2").select("id").eq("id", meta.thread_id).maybeSingle();
            await supabase.from("messages").insert({
              org_id: thread?.org_id || null,
              sender_id: "00000000-0000-0000-0000-000000000000",
              thread_id: meta.thread_id,
              content: `❌ Payment expired\n━━━━━━━━━━━━━━━━\n💵 Amount: ${meta.amount} ${meta.currency}\n📋 Status: ❌ Expired / Cancelled\n━━━━━━━━━━━━━━━━`,
              category: "payment",
              message_type: "system",
              read: false,
            });
          }
        }
        break;
      }
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing event", { error: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/* ── Post-payment automation: commission-split, notification, QR session close ── */
async function runPostPaymentAutomation(supabase: any, pi: Stripe.PaymentIntent, meta: Record<string, string>) {
  const amount = pi.amount / 100;
  const currency = (pi.currency || "aed").toUpperCase();
  const userId = meta.user_id || meta.buyer_user_id || null;
  const merchantId = meta.merchant_id || meta.shop_id || meta.owner_user_id || null;
  const paymentType = meta.type || "payment";
  const qrSessionId = meta.qr_session_id || null;

  // 1. Commission split (idempotent — keyed by payment_intent_id)
  if (merchantId && amount > 0) {
    try {
      logStep("Triggering commission-split", { amount, merchantId });
      await supabase.from("commission_splits").insert({
        id: crypto.randomUUID(),
        payment_intent_id: pi.id,
        merchant_id: merchantId,
        total_amount: amount,
        currency,
        platform_rate: 0.10,
        merchant_rate: 0.80,
        driver_rate: 0.10,
        platform_amount: +(amount * 0.10).toFixed(2),
        merchant_amount: +(amount * 0.80).toFixed(2),
        driver_amount: +(amount * 0.10).toFixed(2),
        driver_id: meta.driver_id || null,
        status: "completed",
        created_at: new Date().toISOString(),
      });
      logStep("Commission split recorded");
    } catch (err: any) {
      // Ignore duplicate key (idempotent)
      if (!err?.message?.includes("duplicate")) {
        console.error("[STRIPE-WEBHOOK] Commission split error:", err?.message);
      }
    }
  }

  // 2. Bank-style payment notification (writes to app_notifications — canonical UI table)
  if (userId) {
    try {
      const merchantName = meta.merchant_name || meta.shop_name || null;
      const typeLabels: Record<string, string> = {
        payment: "Payment Completed", topup: "Wallet Top Up", transfer: "Money Sent",
        rent_payment: "Rent Paid", seasonal_booking: "Booking Confirmed",
        marketplace_booking: "Booking Confirmed", qr_payment: "QR Payment",
        storefront_order: "Order Paid", wallet_topup: "Wallet Top Up",
      };
      const title = typeLabels[paymentType] || "Transaction Update";
      let body = `${amount.toFixed(2)} ${currency}`;
      if (merchantName) body += ` at ${merchantName}`;
      const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      body += ` · ${timeStr}`;

      await supabase.from("notifications").insert({
        id: crypto.randomUUID(),
        user_id: userId,
        title,
        body,
        type: "wallet_" + paymentType,
        read: false,
        metadata_json: {
          amount, currency, merchant_name: merchantName,
          payment_type: paymentType, payment_intent_id: pi.id,
          timestamp: new Date().toISOString(),
        },
      });
      logStep("Payment notification created", { title });
    } catch (err: any) {
      console.error("[STRIPE-WEBHOOK] Notification error:", err?.message);
    }
  }

  // 3. Close QR session if applicable
  if (qrSessionId) {
    try {
      await supabase.from("qr_payment_sessions").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        payment_intent_id: pi.id,
      }).eq("id", qrSessionId).eq("status", "pending");
      logStep("QR session marked completed", { qrSessionId });
    } catch (err: any) {
      console.error("[STRIPE-WEBHOOK] QR session update error:", err?.message);
    }
  }

  // 4. Record in payment_provider_events for audit trail
  try {
    await supabase.from("payment_provider_events").insert({
      provider: "stripe",
      event_type: "payment_automation_complete",
      event_id: crypto.randomUUID(),
      payment_intent_id: pi.id,
      payload_json: {
        user_id: userId, amount, currency, payment_type: paymentType,
        commission_split: !!merchantId, notification_sent: !!userId,
        qr_session_closed: !!qrSessionId,
      },
    });
  } catch { /* non-critical */ }
}

/* ── Handle checkout.session.completed for booking & rent payments ── */
async function handleCheckoutCompleted(supabase: any, stripe: Stripe, session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const type = metadata.type;
  const flow = metadata.flow;
  logStep("Checkout completed", { type, flow, metadata });

  // ── V2 booking payment flow ──
  if (flow === "booking_payment" && metadata.bookingId) {
    await handleV2BookingPayment(supabase, session);
    return;
  }

  // ── V2 rent payment flow ──
  if (flow === "rent_payment" && metadata.rentPaymentId) {
    await handleV2RentPayment(supabase, session);
    return;
  }

  if (type === "seasonal_booking") {
    await handleBookingPayment(supabase, metadata, session);
  } else if (type === "rent_payment") {
    await handleRentPayment(supabase, metadata, session);
  } else if (type === "marketplace_booking") {
    await handleMarketplacePayment(supabase, metadata, session.payment_intent as string || "");
  } else if (type === "orbit_payment") {
    await handleOrbitPaymentCompleted(supabase, session);
  } else if (type === "wallet_topup") {
    await handleWalletTopup(supabase, session);
  } else if (type === "listing_renewal") {
    await handleListingRenewal(supabase, session);
  } else if (type === "listing_boost") {
    await handleListingBoost(supabase, session);
  } else if (type === "storefront_order") {
    await handleStorefrontOrderPayment(supabase, session);
  }
}

/* ── Handle Orbit fiat payment completion (webhook-confirmed) ── */
async function handleOrbitPaymentCompleted(supabase: any, session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const sessionId = session.id;
  const userId = meta.user_id;
  const recipientUserId = meta.recipient_user_id;
  const amount = parseFloat(meta.amount || "0");
  const currency = meta.currency || "EUR";
  const threadId = meta.thread_id || null;
  const contextType = meta.context_type || null;
  const contextId = meta.context_id || null;

  logStep("Processing orbit_payment completion", { sessionId, userId, amount, currency });

  // Update pending wallet_transaction to completed
  const { data: updatedTx } = await supabase
    .from("wallet_transactions")
    .update({ status: "completed" })
    .eq("reference_id", sessionId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updatedTx) {
    logStep("Wallet transaction marked completed", { tx_id: updatedTx.id });
  } else {
    logStep("No pending wallet transaction found for session", { sessionId });
  }

  // ── Cross-module sync: update linked booking/rent if contextId present ──
  if (contextType && contextId) {
    if (contextType === "marketplace_booking" || contextType === "marketplace_service") {
      const { error: mbErr } = await supabase
        .from("marketplace_bookings")
        .update({
          status: "confirmed",
          payment_confirmed: true,
          payment_confirmed_at: new Date().toISOString(),
          payment_method: "stripe_orbit",
          stripe_payment_intent_id: session.payment_intent as string || sessionId,
        })
        .eq("id", contextId);
      if (!mbErr) logStep("Cross-sync: marketplace_booking updated", { contextId });
    } else if (contextType === "concierge_service" || contextType === "concierge") {
      await supabase
        .from("concierge_orders")
        .update({
          status: "confirmed",
          payment_status: "paid",
          confirmed_at: new Date().toISOString(),
          payment_method: "stripe_orbit",
          stripe_session_id: sessionId,
        })
        .eq("id", contextId);
      logStep("Cross-sync: concierge_order updated", { contextId });
    } else if (contextType === "rent" || contextType === "rent_call") {
      await supabase
        .from("rent_calls")
        .update({
          paid: true,
          paid_date: new Date().toISOString().split("T")[0],
          payment_method: "stripe_orbit",
          payment_status: "paid",
        })
        .eq("id", contextId);
      logStep("Cross-sync: rent_call updated", { contextId });
    } else if (contextType === "booking_request") {
      await supabase
        .from("booking_requests")
        .update({ status: "paid" })
        .eq("id", contextId);
      logStep("Cross-sync: booking_request updated", { contextId });
    }
  }

  // Post confirmation message in Orbit chat thread
  if (threadId && userId) {
    const { data: thread } = await supabase
      .from("conversation_threads")
      .select("org_id")
      .eq("id", threadId)
      .maybeSingle();

    const contextLine = contextType && contextId
      ? `\n📎 ${contextType}: ${contextId.slice(0, 8)}`
      : "";

    const richContent = `💰 Payment confirmed\n━━━━━━━━━━━━━━━━\n💵 Amount: ${amount} ${currency}\n💳 Method: Card (Stripe)\n📋 Status: ✅ Completed (verified)\n🔖 Ref: ${sessionId.slice(0, 16)}${contextLine}\n━━━━━━━━━━━━━━━━`;

    await supabase.from("messages").insert({
      org_id: thread?.org_id || null,
      sender_id: "00000000-0000-0000-0000-000000000000",
      thread_id: threadId,
      content: richContent,
      category: "payment",
      message_type: "system",
      read: false,
      context_type: contextType,
      context_id: contextId,
    });

    logStep("Payment confirmation message sent to thread", { threadId });
  }

  // Notify recipient
  if (recipientUserId) {
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("id", userId)
      .maybeSingle();
    const senderName = senderProfile?.name || senderProfile?.email || "Someone";

    // Get org_id from thread or first available org
    let notifOrgId = null;
    if (threadId) {
      const { data: t } = await supabase.from("conversation_threads").select("org_id").eq("id", threadId).maybeSingle();
      notifOrgId = t?.org_id;
    }

    await supabase.from("notifications").insert({
      user_id: recipientUserId,
      org_id: notifOrgId,
      type: "payment",
      title: "💰 Payment received",
      message: `${senderName} sent you ${amount} ${currency} via Card (Stripe)`,
      link: "/app/orbit",
      metadata_json: {
        target_type: "payment",
        target_id: updatedTx?.id || sessionId,
        amount, currency,
        target_url: "/app/orbit",
      },
    });
    logStep("Recipient notification sent", { recipientUserId });
  }

  // Audit
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "orbit_payment_fiat_completed",
    metadata_json: {
      session_id: sessionId,
      amount,
      currency,
      recipient_user_id: recipientUserId,
      thread_id: threadId,
      context_type: contextType,
      context_id: contextId,
      tx_id: updatedTx?.id,
      cross_module_sync: !!contextType,
    },
  });

  logStep("Orbit fiat payment fully processed", { sessionId });
}

/** Handle marketplace booking payment completion */
async function handleMarketplacePayment(supabase: any, metadata: Record<string, string>, paymentIntentId: string) {
  const bookingId = metadata.marketplace_booking_id;
  if (!bookingId) return;

  logStep("Processing marketplace booking payment", { bookingId });

  // Update the marketplace booking to paid + confirmed
  const { error: updateError } = await supabase.from("marketplace_bookings").update({
    status: "confirmed",
    payment_confirmed: true,
    payment_confirmed_at: new Date().toISOString(),
    payment_method: "stripe",
    stripe_payment_intent_id: paymentIntentId || null,
  }).eq("id", bookingId);

  if (updateError) {
    logStep("Error updating marketplace booking", { error: updateError.message });
    return;
  }

  // Fetch booking details
  const { data: booking } = await supabase
    .from("marketplace_bookings")
    .select("*")
    .eq("id", bookingId)
    .single();
  if (!booking) { logStep("Marketplace booking not found"); return; }

  // Fetch service details
  const { data: service } = await supabase
    .from("marketplace_services")
    .select("title, category, country, currency")
    .eq("id", booking.service_id)
    .single();

  // Fetch provider details
  const { data: provider } = await supabase
    .from("marketplace_providers")
    .select("user_id, display_name")
    .eq("id", booking.provider_id)
    .single();

  // Notify provider
  if (provider?.user_id) {
    await supabase.from("notifications").insert({
      user_id: provider.user_id,
      org_id: booking.org_id,
      type: "info",
      title: "💰 Marketplace payment received",
      message: `${booking.booker_name} paid ${booking.total_price} ${booking.currency} for ${service?.title || "service"} (Stripe)`,
      link: `/dashboard/activities?booking=${bookingId}`,
    });
  }

  // Email confirmation to booker
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  if (booking.booker_email && SENDGRID_API_KEY) {
    try {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: booking.booker_email }] }],
          from: { email: "noreply@easy-locs.com", name: "Easy-Locs" },
          subject: `✅ Payment confirmed — ${service?.title || "Service"}`,
          content: [{
            type: "text/html",
            value: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
              <h2 style="color:#1a2744;text-align:center;">✅ Payment Confirmed</h2>
              <p style="color:#555;">Hello ${booking.booker_name},</p>
              <p style="color:#555;">Your payment of <strong>${booking.total_price} ${booking.currency}</strong> for "${service?.title || "Service"}" has been confirmed.</p>
              <p style="color:#555;">Date: ${booking.service_date || booking.date_from || "—"}</p>
              <p style="color:#aaa;font-size:11px;text-align:center;margin-top:32px;">EASY-LOCS® — Smart Property Management</p>
            </div>`,
          }],
        }),
      });
      logStep("Marketplace payment confirmation email sent");
    } catch (e) {
      logStep("Email error (non-blocking)", { error: String(e) });
    }
  }

  logStep("Marketplace payment fully processed", { bookingId });
}

async function handleBookingPayment(supabase: any, metadata: Record<string, string>, session: Stripe.Checkout.Session) {
  const bookingRequestId = metadata.booking_request_id;
  if (!bookingRequestId) return;

  logStep("Processing booking payment", { bookingRequestId });

  const { data: br } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("id", bookingRequestId)
    .single();
  if (!br) { logStep("Booking request not found"); return; }

  await supabase.from("booking_requests").update({ status: "paid" }).eq("id", bookingRequestId);

  const { data: listing } = await supabase
    .from("public_listings")
    .select("title, price_per_night")
    .eq("id", br.listing_id)
    .single();

  const nights = Math.ceil(
    (new Date(br.check_out).getTime() - new Date(br.check_in).getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalPrice = nights * (listing?.price_per_night || 0);

  // Get property country for localization
  const { data: property } = await supabase
    .from("properties")
    .select("country")
    .eq("id", br.property_id)
    .single();
  const locale = getLocale(property?.country || "FR");

  const { data: org } = await supabase
    .from("orgs")
    .select("owner_user_id")
    .eq("id", br.org_id)
    .single();

  if (org?.owner_user_id) {
    // Check for date overlaps before creating booking
    const { data: overlapping } = await supabase
      .from("seasonal_bookings")
      .select("id")
      .eq("property_id", br.property_id)
      .eq("status", "confirmed")
      .lt("check_in", br.check_out)
      .gt("check_out", br.check_in)
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      logStep("Date overlap detected, skipping booking creation", { property_id: br.property_id });
    } else {
      await supabase.from("seasonal_bookings").insert({
        org_id: br.org_id,
        user_id: org.owner_user_id,
        property_id: br.property_id,
        guest_name: br.guest_name,
        guest_email: br.guest_email || "",
        guest_phone: br.guest_phone || "",
        check_in: br.check_in,
        check_out: br.check_out,
        total_price: totalPrice,
        cleaning_fee: 0,
        deposit_amount: 0,
        notes: `Paiement en ligne - Stripe ${session.payment_intent || ""}`,
        status: "confirmed",
      });
      logStep("Seasonal booking created (dates blocked)");
    }

    // Also create a reservation record
    await supabase.from("reservations").insert({
      org_id: br.org_id,
      user_id: org.owner_user_id,
      property_id: br.property_id,
      guest_name: br.guest_name,
      guest_email: br.guest_email || "",
      guest_phone: br.guest_phone || "",
      check_in: br.check_in,
      check_out: br.check_out,
      amount: totalPrice,
      currency: locale.currency,
      status: "confirmed",
      notes: `Stripe payment ${session.payment_intent || ""}`,
    });

    // Notify owner
    await supabase.from("notifications").insert({
      user_id: org.owner_user_id,
      org_id: br.org_id,
      type: "info",
      title: locale.strings.bookingPaidTitle,
      message: tpl(locale.strings.bookingPaidMsg, {
        guest: br.guest_name,
        amount: totalPrice,
        symbol: locale.currencySymbol,
        listing: listing?.title || "",
        checkin: br.check_in,
        checkout: br.check_out,
      }),
      link: "/dashboard/seasonal",
    });
  }

  // Email confirmation to guest
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  const nightsLabel = nights > 1 ? locale.strings.nightsSuffixPlural : locale.strings.nightsSuffix;
  if (br.guest_email && SENDGRID_API_KEY) {
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: br.guest_email }] }],
        from: { email: "noreply@easy-locs.com", name: "Easy-Locs" },
        reply_to: { email: "contact@easy-locs.com", name: "Easy-Locs" },
        subject: `${locale.strings.bookingConfirmedTitle} — ${listing?.title || ""}`,
        content: [{
          type: "text/html",
          value: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
            <h2 style="color:#1a2744;text-align:center;">${locale.strings.bookingConfirmedTitle}</h2>
            <p style="color:#555;">${tpl(locale.strings.bookingConfirmedGreeting, { name: br.guest_name })}</p>
            <p style="color:#555;">${tpl(locale.strings.bookingConfirmedBody, { amount: totalPrice, currency: locale.currency })}</p>
            <table style="width:100%;margin:16px 0;border-collapse:collapse;">
              <tr><td style="padding:8px;color:#888;">${locale.strings.arrival}</td><td style="padding:8px;font-weight:600;">${br.check_in}</td></tr>
              <tr><td style="padding:8px;color:#888;">${locale.strings.departure}</td><td style="padding:8px;font-weight:600;">${br.check_out}</td></tr>
              <tr><td style="padding:8px;color:#888;">${locale.strings.duration}</td><td style="padding:8px;">${nights} ${nightsLabel}</td></tr>
            </table>
            <p style="color:#aaa;font-size:11px;text-align:center;margin-top:32px;">${locale.strings.footer}</p>
          </div>`,
        }],
      }),
    });
    logStep("Guest confirmation email sent");
  }
}

async function handleRentPayment(supabase: any, metadata: Record<string, string>, session: Stripe.Checkout.Session) {
  const rentCallId = metadata.rent_call_id;
  if (!rentCallId) return;

  logStep("Processing rent payment", { rentCallId });

  // Mark rent call as paid
  await supabase.from("rent_calls").update({
    paid: true,
    paid_date: new Date().toISOString(),
    payment_method: "stripe",
    payment_status: "paid",
    stripe_payment_intent_id: session.payment_intent || null,
  }).eq("id", rentCallId);

  const { data: rc } = await supabase.from("rent_calls").select("*").eq("id", rentCallId).single();
  if (!rc) return;

  // Get tenant + property info
  const { data: tenant } = await supabase.from("tenants").select("name, email, tenant_user_id, property_id").eq("id", rc.tenant_id).single();
  const { data: org } = await supabase.from("orgs").select("owner_user_id, email, name").eq("id", rc.org_id).single();

  // Get property country for localization
  let propertyCountry = "FR";
  if (rc.property_id) {
    const { data: prop } = await supabase.from("properties").select("country").eq("id", rc.property_id).single();
    if (prop?.country) propertyCountry = prop.country;
  } else if (tenant?.property_id) {
    const { data: prop } = await supabase.from("properties").select("country").eq("id", tenant.property_id).single();
    if (prop?.country) propertyCountry = prop.country;
  }
  const locale = getLocale(propertyCountry);

  // Auto-generate receipt document
  if (org?.owner_user_id) {
    try {
      await supabase.from("documents").insert({
        org_id: rc.org_id,
        user_id: org.owner_user_id,
        doc_type: "rent_receipt",
        title: tpl(locale.strings.receiptTitle, { month: rc.month }),
        country: propertyCountry,
        status: "final",
        data_json: {
          tenant_name: tenant?.name || "",
          month: rc.month,
          rent_amount: rc.rent_amount,
          charges_amount: rc.charges_amount,
          total_amount: rc.total_amount,
          paid_date: new Date().toISOString().split("T")[0],
          payment_method: "stripe",
        },
        lease_id: null,
      });

      // Mark receipt as validated on rent_call
      await supabase.from("rent_calls").update({
        receipt_validated: true,
      }).eq("id", rentCallId);

      logStep("Receipt document auto-generated");
    } catch (err) {
      logStep("Error generating receipt", { error: String(err) });
    }
  }

  // Notify owner
  if (org?.owner_user_id) {
    await supabase.from("notifications").insert({
      user_id: org.owner_user_id,
      org_id: rc.org_id,
      type: "info",
      title: locale.strings.rentPaidTitle,
      message: tpl(locale.strings.rentPaidMsg, {
        tenant: tenant?.name || "Locataire",
        amount: rc.total_amount,
        symbol: locale.currencySymbol,
        month: rc.month,
      }),
      link: "/dashboard/rental?tab=payments",
    });
  }

  // Notify tenant
  if (tenant?.tenant_user_id) {
    await supabase.from("notifications").insert({
      user_id: tenant.tenant_user_id,
      org_id: rc.org_id,
      type: "info",
      title: locale.strings.paymentConfirmedTitle,
      message: tpl(locale.strings.paymentConfirmedMsg, {
        amount: rc.total_amount,
        symbol: locale.currencySymbol,
        month: rc.month,
      }),
      link: "/tenant/receipts",
    });
  }

  // Send email to both parties
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  if (SENDGRID_API_KEY) {
    const recipients: string[] = [];
    if (tenant?.email) recipients.push(tenant.email);
    if (org?.email) recipients.push(org.email);

    for (const email of recipients) {
      const isTenant = email === tenant?.email;
      try {
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: "noreply@easy-locs.com", name: "Easy-Locs" },
            reply_to: { email: "contact@easy-locs.com", name: "Easy-Locs" },
            subject: isTenant
              ? `${locale.strings.paymentConfirmedTitle} — ${rc.month}`
              : `${locale.strings.rentPaidTitle} — ${rc.month}`,
            content: [{
              type: "text/html",
              value: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
                <h2 style="color:#1a2744;text-align:center;">${isTenant ? locale.strings.paymentConfirmedTitle : locale.strings.rentPaidTitle}</h2>
                <p style="color:#555;">${isTenant
                  ? tpl(locale.strings.paymentConfirmedMsg, { amount: rc.total_amount, symbol: locale.currencySymbol, month: rc.month })
                  : tpl(locale.strings.rentPaidMsg, { tenant: tenant?.name || "", amount: rc.total_amount, symbol: locale.currencySymbol, month: rc.month })
                }</p>
                <p style="color:#aaa;font-size:11px;text-align:center;margin-top:32px;">${locale.strings.footer}</p>
              </div>`,
            }],
          }),
        });
      } catch (err) {
        logStep("Error sending rent email", { email, error: String(err) });
      }
    }
    logStep("Rent payment emails sent", { count: recipients.length });
  }

  logStep("Rent payment fully processed");
}

/* ── V2 Booking Payment (bookings table with ownerOrbitId) ── */
async function handleV2BookingPayment(supabase: any, session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const bookingId = meta.bookingId;
  const listingId = meta.listingId || null;
  const paymentIntentId = session.payment_intent as string | null;
  const amountTotal = session.amount_total ?? 0;
  const currency = (session.currency ?? "aed").toUpperCase();
  const now = new Date().toISOString();
  const eventId = `stripe_v2_booking_${session.id}`;

  logStep("V2 booking payment", { bookingId, paymentIntentId });

  // Idempotency check
  const { data: existing } = await supabase
    .from("payment_events")
    .select("processed")
    .eq("id", eventId)
    .maybeSingle();
  if (existing?.processed) { logStep("V2 booking already processed"); return; }

  await supabase.from("payment_events").upsert({
    id: eventId,
    provider: "stripe",
    event_type: "checkout.session.completed",
    external_id: session.id,
    processed: false,
    metadata: { bookingId, listingId, paymentIntentId },
    created_at: now,
  });

  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();
  if (bErr || !booking) { logStep("V2 booking not found", { bookingId }); return; }

  const nextStatus = booking.status === "pending_payment" ? "confirmed" : booking.status;
  await supabase.from("bookings").update({
    status: nextStatus,
    transactionId: paymentIntentId,
    updatedAt: now,
  }).eq("id", bookingId);

  await supabase.from("wallet_transactions").insert({
    id: `tx_${crypto.randomUUID().slice(0, 8)}`,
    type: "payment",
    status: "success",
    amount: amountTotal / 100,
    currency,
    reference: `booking:${bookingId}`,
    createdAt: now,
  });

  const { data: ownerOrbit } = await supabase
    .from("orbit_profiles")
    .select("id, orbit_id")
    .eq("orbit_id", booking.ownerOrbitId)
    .maybeSingle();

  if (ownerOrbit?.id) {
    await supabase.from("notifications").insert({
      id: crypto.randomUUID(),
      user_id: ownerOrbit.id,
      type: "payment",
      title: "Booking payment received",
      body: `Booking ${bookingId} paid successfully`,
      read: false,
      metadata_json: { bookingId, paymentIntentId, listingId },
    });
  }

  if (booking.conversationId) {
    await supabase.from("chat_messages").insert({
      id: `msg_${crypto.randomUUID().slice(0, 8)}`,
      conversationId: booking.conversationId,
      senderOrbitId: booking.ownerOrbitId,
      type: "payment",
      body: "Payment received and booking confirmed",
      metadata: { bookingId, paymentIntentId },
      createdAt: now,
    });
  }

  await supabase.from("payment_events").update({ processed: true }).eq("id", eventId);
  logStep("V2 booking payment fully processed", { bookingId });
}

/* ── V2 Rent Payment (rent_payments table with ownerOrbitId) ── */
async function handleV2RentPayment(supabase: any, session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const rentPaymentId = meta.rentPaymentId;
  const leaseId = meta.leaseId || null;
  const paymentIntentId = session.payment_intent as string | null;
  const amountTotal = session.amount_total ?? 0;
  const currency = (session.currency ?? "aed").toUpperCase();
  const now = new Date().toISOString();
  const eventId = `stripe_v2_rent_${session.id}`;

  logStep("V2 rent payment", { rentPaymentId, paymentIntentId });

  const { data: existing } = await supabase
    .from("payment_events")
    .select("processed")
    .eq("id", eventId)
    .maybeSingle();
  if (existing?.processed) { logStep("V2 rent already processed"); return; }

  await supabase.from("payment_events").upsert({
    id: eventId,
    provider: "stripe",
    event_type: "checkout.session.completed",
    external_id: session.id,
    processed: false,
    metadata: { rentPaymentId, leaseId, paymentIntentId },
    created_at: now,
  });

  const { data: rentPayment, error: rErr } = await supabase
    .from("rent_payments")
    .select("*")
    .eq("id", rentPaymentId)
    .single();
  if (rErr || !rentPayment) { logStep("V2 rent payment not found"); return; }

  await supabase.from("rent_payments").update({
    status: "paid",
    paidAt: now,
    transactionId: paymentIntentId,
    updatedAt: now,
  }).eq("id", rentPaymentId);

  await supabase.from("wallet_transactions").insert({
    id: `tx_${crypto.randomUUID().slice(0, 8)}`,
    type: "payment",
    status: "success",
    amount: amountTotal / 100,
    currency,
    reference: `rent:${rentPaymentId}`,
    createdAt: now,
  });

  const { data: ownerOrbit } = await supabase
    .from("orbit_profiles")
    .select("id, orbit_id")
    .eq("orbit_id", rentPayment.ownerOrbitId)
    .maybeSingle();

  if (ownerOrbit?.id) {
    await supabase.from("notifications").insert({
      id: crypto.randomUUID(),
      user_id: ownerOrbit.id,
      type: "rent",
      title: "Rent payment received",
      body: `Rent payment ${rentPaymentId} paid successfully`,
      read: false,
      metadata_json: { rentPaymentId, paymentIntentId, leaseId },
    });
  }

  await supabase.from("payment_events").update({ processed: true }).eq("id", eventId);
  logStep("V2 rent payment fully processed", { rentPaymentId });
}

async function handleSubscriptionChange(supabase: any, stripe: Stripe, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByCustomerId(supabase, stripe, customerId);
  if (!userId) { logStep("No user found for customer", { customerId }); return; }

  const productId = subscription.items.data[0]?.price?.product as string;
  const plan = PRODUCT_MAP[productId] || "unlimited_monthly";
  const status = subscription.status === "trialing" ? "trialing" : subscription.status === "active" ? "active" : subscription.status;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  await supabase.from("subscriptions").upsert(
    { user_id: userId, stripe_customer_id: customerId, stripe_subscription_id: subscription.id, plan, status, current_period_end: currentPeriodEnd },
    { onConflict: "user_id" }
  );
  logStep("Subscription synced", { userId, plan, status });
}

async function handleSubscriptionDeleted(supabase: any, stripe: Stripe, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByCustomerId(supabase, stripe, customerId);
  if (!userId) { logStep("No user found for deleted subscription", { customerId }); return; }
  await supabase.from("subscriptions").update({ status: "canceled", plan: "free", stripe_subscription_id: null }).eq("user_id", userId);
  logStep("Subscription canceled", { userId });
}

async function getUserIdByCustomerId(supabase: any, stripe: Stripe, customerId: string): Promise<string | null> {
  const { data: sub } = await supabase.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).limit(1).maybeSingle();
  if (sub?.user_id) return sub.user_id;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) return null;
    const email = (customer as Stripe.Customer).email;
    if (!email) return null;
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).limit(1).maybeSingle();
    return profile?.id || null;
  } catch { return null; }
}

/* ── Handle wallet top-up checkout completion ── */
async function handleWalletTopup(supabase: any, session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const userId = meta.user_id;
  const amount = parseFloat(meta.amount || "0");
  const currency = meta.currency || "AED";
  const sessionId = session.id;

  logStep("Processing wallet_topup", { userId, amount, currency, sessionId });

  if (!userId || !amount || amount <= 0) {
    logStep("Invalid wallet_topup metadata", { userId, amount });
    return;
  }

  // Idempotency: check if already processed via payment_events
  const { data: existingEvent } = await supabase
    .from("payment_events")
    .select("id")
    .eq("external_id", sessionId)
    .eq("event_type", "wallet_topup_completed")
    .maybeSingle();

  if (existingEvent) {
    logStep("Wallet topup already processed (idempotent skip)", { sessionId });
    return;
  }

  // Record payment event for idempotency
  await supabase.from("payment_events").insert({
    id: crypto.randomUUID(),
    external_id: sessionId,
    event_type: "wallet_topup_completed",
    provider: "stripe",
    processed: true,
    metadata: { amount, currency, user_id: userId },
  });

  // Credit wallet_ledger_entries — canonical ledger
  const { error: ledgerError } = await supabase.from("wallet_ledger_entries").insert({
    user_id: userId,
    entry_type: "credit",
    amount,
    source: "stripe_topup",
    status: "completed",
    reference_id: sessionId,
  });

  if (ledgerError) {
    logStep("wallet_ledger insert error", { error: ledgerError.message });
  } else {
    logStep("Wallet credited via ledger", { userId, amount, currency });
  }

  // Update payment record status
  await supabase
    .from("payments")
    .update({ status: "completed", provider_payment_id: session.payment_intent as string || sessionId, updated_at: new Date().toISOString() })
    .eq("provider_payment_id", sessionId)
    .eq("payment_type", "wallet_topup");

  // Create notification
  await supabase.from("notifications").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    title: `💰 Wallet credited: ${amount} ${currency}`,
    body: `Your wallet has been topped up with ${amount} ${currency} via card payment.`,
    type: "wallet_credit",
    read: false,
  });

  logStep("Wallet topup complete", { userId, amount });
}

/* ── Handle listing renewal payment (webhook-confirmed) ── */
async function handleListingRenewal(supabase: any, session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const listingId = meta.listing_id;
  const userId = meta.user_id;
  const sessionId = session.id;

  if (!listingId || !userId) {
    logStep("Missing listing_id or user_id for renewal", { meta });
    return;
  }

  logStep("Processing listing renewal", { listingId, userId });

  // Idempotency: check if already processed
  const { data: existing } = await supabase
    .from("payment_events")
    .select("id")
    .eq("provider_event_id", sessionId)
    .eq("event_type", "listing_renewal_completed")
    .maybeSingle();

  if (existing) {
    logStep("Listing renewal already processed (idempotent)", { sessionId });
    return;
  }

  // Record payment event
  await supabase.from("payment_events").insert({
    provider_event_id: sessionId,
    event_type: "listing_renewal_completed",
    provider: "stripe",
    processed: true,
    metadata: { listing_id: listingId, user_id: userId, amount: meta.amount_aed },
  });

  // Renew listing: extend 30 days
  const now = new Date();
  const newExpiry = new Date(now.getTime() + 30 * 86400000).toISOString();

  await supabase
    .from("marketplace_services")
    .update({
      status: "published",
      active: true,
      listing_expires_at: newExpiry,
      last_renewed_at: now.toISOString(),
      auto_expire: true,
      archived_at: null,
      updated_at: now.toISOString(),
    })
    .eq("id", listingId)
    .eq("user_id", userId);

  // Increment renewal count
  await supabase.rpc("increment_listing_renewal_count", { p_listing_id: listingId }).catch(() => {});

  // Notification
  await supabase.from("notifications").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    title: "✅ Listing renewed",
    body: `Your listing has been renewed for 30 more days.`,
    type: "listing_renewed",
    read: false,
  });

  logStep("Listing renewal complete", { listingId, newExpiry });
}

/* ── Handle listing boost payment (webhook-confirmed) ── */
async function handleListingBoost(supabase: any, session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const listingId = meta.listing_id;
  const userId = meta.user_id;
  const boostTier = meta.boost_tier || "basic";
  const sessionId = session.id;

  if (!listingId || !userId) {
    logStep("Missing listing_id or user_id for boost", { meta });
    return;
  }

  logStep("Processing listing boost", { listingId, userId, boostTier });

  // Idempotency
  const { data: existing } = await supabase
    .from("payment_events")
    .select("id")
    .eq("provider_event_id", sessionId)
    .eq("event_type", "listing_boost_completed")
    .maybeSingle();

  if (existing) {
    logStep("Listing boost already processed (idempotent)", { sessionId });
    return;
  }

  await supabase.from("payment_events").insert({
    provider_event_id: sessionId,
    event_type: "listing_boost_completed",
    provider: "stripe",
    processed: true,
    metadata: { listing_id: listingId, user_id: userId, boost_tier: boostTier, amount: meta.amount_aed },
  });

  // Boost config
  const BOOST_CFG: Record<string, { multiplier: number; days: number }> = {
    basic: { multiplier: 1.2, days: 7 },
    premium: { multiplier: 1.5, days: 14 },
    featured: { multiplier: 2.0, days: 30 },
  };

  const cfg = BOOST_CFG[boostTier] || BOOST_CFG.basic;
  const now = new Date();
  const boostExpiry = new Date(now.getTime() + cfg.days * 86400000).toISOString();

  await supabase
    .from("marketplace_services")
    .update({
      boost_enabled: true,
      boost_multiplier: cfg.multiplier,
      boost_expires_at: boostExpiry,
      updated_at: now.toISOString(),
    })
    .eq("id", listingId)
    .eq("user_id", userId);

  // Notification
  const tierLabel = boostTier.charAt(0).toUpperCase() + boostTier.slice(1);
  await supabase.from("notifications").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    title: `🚀 Boost activated — ${tierLabel}`,
    body: `Your listing is now boosted ${cfg.multiplier}x for ${cfg.days} days.`,
    type: "listing_boosted",
    read: false,
  });

  logStep("Listing boost complete", { listingId, boostTier, boostExpiry });
}

/* ── Handle storefront order payment (webhook-confirmed) ── */
async function handleStorefrontOrderPayment(supabase: any, session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const orderId = meta.order_id;
  const shopId = meta.shop_id;
  const buyerId = meta.buyer_id;
  const sellerId = meta.seller_id;
  const paymentIntentId = (session.payment_intent as string) || session.id;

  if (!orderId) {
    logStep("storefront_order: no order_id in metadata, skipping");
    return;
  }

  logStep("Processing storefront_order payment", { orderId, shopId });

  // ── Idempotency: check if already paid ──
  const { data: order } = await supabase
    .from("storefront_orders")
    .select("id, payment_status, status, total, currency, seller_id")
    .eq("id", orderId)
    .single();

  if (!order) {
    logStep("storefront_order: order not found", { orderId });
    return;
  }

  // Normalized idempotency: skip if already paid/failed/refunded
  if (["paid", "failed", "refunded"].includes(order.payment_status)) {
    logStep("storefront_order: already processed, idempotent skip", { orderId, payment_status: order.payment_status });
    return;
  }

  // ── Mark payment as paid, order as paid (seller must still confirm) ──
  const { error: updateErr } = await supabase
    .from("storefront_orders")
    .update({
      payment_status: "paid",
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      stripe_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateErr) {
    logStep("storefront_order: update failed", { error: updateErr.message });
    return;
  }

  logStep("storefront_order: marked paid (seller acceptance pending)", { orderId });

  // ── Status history (idempotent via unique index on order_id+status+actor_type=system) ──
  await supabase.from("order_status_history").insert({
    order_id: orderId,
    status: "paid",
    actor_type: "system",
    actor_id: null,
    notes: "Payment confirmed via Stripe webhook",
  }).then(({ error }: any) => {
    if (error) logStep("status_history insert (dedup expected)", { error: error.message });
  });

  // ── Payment event record (idempotent via unique constraint on external_id+event_type) ──
  await supabase.from("payment_events").insert({
    event_type: "storefront_order_paid",
    provider: "stripe",
    external_id: session.id,
    processed: true,
    metadata: { payment_intent: paymentIntentId, shop_id: shopId, order_id: orderId, buyer_id: buyerId, amount: order.total, currency: order.currency },
  }).then(({ error }: any) => {
    if (error) logStep("payment_event insert (dedup expected)", { error: error.message });
  });

  // ── Notify seller (idempotent: use upsert with composite key simulation) ──
  const targetSeller = sellerId || order.seller_id;
  if (targetSeller) {
    const sellerNotifId = `order_paid_seller_${orderId}`;
    await supabase.from("notifications").upsert({
      id: sellerNotifId,
      user_id: targetSeller,
      type: "order_received",
      title: "🛒 New paid order",
      message: `Order #${orderId.slice(0, 8).toUpperCase()} — ${order.total} ${order.currency}`,
      link: `/pos/${shopId}`,
      priority: "high",
      category: "order",
    }, { onConflict: "id" }).then(({ error }: any) => {
      if (error) logStep("seller notif upsert non-fatal", { error: error.message });
    });
  }

  // ── Notify buyer (idempotent) ──
  if (buyerId) {
    const buyerNotifId = `order_paid_buyer_${orderId}`;
    await supabase.from("notifications").upsert({
      id: buyerNotifId,
      user_id: buyerId,
      type: "payment_received",
      title: "✅ Payment confirmed",
      message: `Your order #${orderId.slice(0, 8).toUpperCase()} is paid — awaiting seller confirmation`,
      link: `/order/${orderId}`,
      priority: "normal",
      category: "order",
    }, { onConflict: "id" }).then(({ error }: any) => {
      if (error) logStep("buyer notif upsert non-fatal", { error: error.message });
    });
  }

  logStep("storefront_order payment fully processed", { orderId });
}

