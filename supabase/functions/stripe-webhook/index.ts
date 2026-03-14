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

/* ── Handle checkout.session.completed for booking & rent payments ── */
async function handleCheckoutCompleted(supabase: any, stripe: Stripe, session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const type = metadata.type;
  logStep("Checkout completed", { type, metadata });

  if (type === "seasonal_booking") {
    await handleBookingPayment(supabase, metadata, session);
  } else if (type === "rent_payment") {
    await handleRentPayment(supabase, metadata, session);
  } else if (type === "marketplace_booking") {
    await handleMarketplacePayment(supabase, metadata, session.payment_intent as string || "");
  } else if (type === "orbit_payment") {
    await handleOrbitPaymentCompleted(supabase, session);
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

  // Post confirmation message in Orbit chat thread
  if (threadId && userId) {
    // Get sender org_id from thread
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
      tx_id: updatedTx?.id,
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
