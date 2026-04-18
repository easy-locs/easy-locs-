import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

/** Country → locale mapping */
const COUNTRY_LOCALE: Record<string, { lang: string; currency: string; symbol: string }> = {
  FR: { lang: "fr", currency: "EUR", symbol: "€" }, ES: { lang: "es", currency: "EUR", symbol: "€" },
  DE: { lang: "de", currency: "EUR", symbol: "€" }, IT: { lang: "it", currency: "EUR", symbol: "€" },
  PT: { lang: "pt", currency: "EUR", symbol: "€" }, GB: { lang: "en", currency: "GBP", symbol: "£" },
  US: { lang: "en", currency: "USD", symbol: "$" }, CH: { lang: "fr", currency: "CHF", symbol: "CHF" },
  BE: { lang: "fr", currency: "EUR", symbol: "€" }, NL: { lang: "nl", currency: "EUR", symbol: "€" },
  AT: { lang: "de", currency: "EUR", symbol: "€" }, LU: { lang: "fr", currency: "EUR", symbol: "€" },
  IE: { lang: "en", currency: "EUR", symbol: "€" }, MA: { lang: "fr", currency: "MAD", symbol: "MAD" },
  TN: { lang: "fr", currency: "TND", symbol: "TND" }, SE: { lang: "en", currency: "SEK", symbol: "kr" },
  NO: { lang: "en", currency: "NOK", symbol: "kr" }, DK: { lang: "en", currency: "DKK", symbol: "kr" },
  PL: { lang: "en", currency: "PLN", symbol: "zł" }, CZ: { lang: "en", currency: "CZK", symbol: "Kč" },
};

const i18n: Record<string, Record<string, string>> = {
  fr: {
    ownerTitle: "🏖️ Nouvelle demande de réservation",
    ownerSubject: "🏖️ Nouvelle demande — {guest}",
    guestSubject: "✅ Votre demande de réservation — {property}",
    guestTitle: "✅ Demande de réservation reçue",
    guestGreeting: "Bonjour {name},",
    guestBody: "Votre demande de réservation pour <strong>{property}</strong> a bien été enregistrée.",
    arrival: "Arrivée", departure: "Départ", duration: "Durée", total: "Total",
    nightLabel: "nuit", nightsLabel: "nuits",
    traveler: "Voyageur", email: "Email", phone: "Téléphone", property: "Bien",
    dates: "Dates", amount: "Montant", message: "Message",
    payBtn: "💳 Payer {amount} {currency}",
    payNote: "Paiement sécurisé par carte ou Apple Pay",
    ownerWillReply: "Le propriétaire reviendra vers vous dans les plus brefs délais.",
    manageBtn: "Gérer les réservations",
    viewListing: "Voir l'annonce complète →",
    footer: "EASY-LOCS® — Gestion locative intelligente",
  },
  en: {
    ownerTitle: "🏖️ New booking request",
    ownerSubject: "🏖️ New request — {guest}",
    guestSubject: "✅ Your booking request — {property}",
    guestTitle: "✅ Booking request received",
    guestGreeting: "Hello {name},",
    guestBody: "Your booking request for <strong>{property}</strong> has been received.",
    arrival: "Check-in", departure: "Check-out", duration: "Duration", total: "Total",
    nightLabel: "night", nightsLabel: "nights",
    traveler: "Guest", email: "Email", phone: "Phone", property: "Property",
    dates: "Dates", amount: "Amount", message: "Message",
    payBtn: "💳 Pay {amount} {currency}",
    payNote: "Secure payment by card or Apple Pay",
    ownerWillReply: "The owner will get back to you shortly.",
    manageBtn: "Manage bookings",
    viewListing: "View full listing →",
    footer: "EASY-LOCS® — Smart property management",
  },
  es: {
    ownerTitle: "🏖️ Nueva solicitud de reserva",
    ownerSubject: "🏖️ Nueva solicitud — {guest}",
    guestSubject: "✅ Su solicitud de reserva — {property}",
    guestTitle: "✅ Solicitud de reserva recibida",
    guestGreeting: "Hola {name},",
    guestBody: "Su solicitud de reserva para <strong>{property}</strong> ha sido registrada.",
    arrival: "Llegada", departure: "Salida", duration: "Duración", total: "Total",
    nightLabel: "noche", nightsLabel: "noches",
    traveler: "Viajero", email: "Email", phone: "Teléfono", property: "Propiedad",
    dates: "Fechas", amount: "Importe", message: "Mensaje",
    payBtn: "💳 Pagar {amount} {currency}",
    payNote: "Pago seguro con tarjeta o Apple Pay",
    ownerWillReply: "El propietario se pondrá en contacto con usted en breve.",
    manageBtn: "Gestionar reservas",
    viewListing: "Ver anuncio completo →",
    footer: "EASY-LOCS® — Gestión inmobiliaria inteligente",
  },
  de: {
    ownerTitle: "🏖️ Neue Buchungsanfrage",
    ownerSubject: "🏖️ Neue Anfrage — {guest}",
    guestSubject: "✅ Ihre Buchungsanfrage — {property}",
    guestTitle: "✅ Buchungsanfrage eingegangen",
    guestGreeting: "Hallo {name},",
    guestBody: "Ihre Buchungsanfrage für <strong>{property}</strong> wurde registriert.",
    arrival: "Anreise", departure: "Abreise", duration: "Dauer", total: "Gesamt",
    nightLabel: "Nacht", nightsLabel: "Nächte",
    traveler: "Gast", email: "E-Mail", phone: "Telefon", property: "Objekt",
    dates: "Daten", amount: "Betrag", message: "Nachricht",
    payBtn: "💳 {amount} {currency} bezahlen",
    payNote: "Sichere Zahlung per Karte oder Apple Pay",
    ownerWillReply: "Der Eigentümer wird sich in Kürze bei Ihnen melden.",
    manageBtn: "Buchungen verwalten",
    viewListing: "Vollständiges Inserat ansehen →",
    footer: "EASY-LOCS® — Intelligente Immobilienverwaltung",
  },
  it: {
    ownerTitle: "🏖️ Nuova richiesta di prenotazione",
    ownerSubject: "🏖️ Nuova richiesta — {guest}",
    guestSubject: "✅ La tua richiesta di prenotazione — {property}",
    guestTitle: "✅ Richiesta di prenotazione ricevuta",
    guestGreeting: "Ciao {name},",
    guestBody: "La tua richiesta di prenotazione per <strong>{property}</strong> è stata registrata.",
    arrival: "Arrivo", departure: "Partenza", duration: "Durata", total: "Totale",
    nightLabel: "notte", nightsLabel: "notti",
    traveler: "Viaggiatore", email: "Email", phone: "Telefono", property: "Proprietà",
    dates: "Date", amount: "Importo", message: "Messaggio",
    payBtn: "💳 Paga {amount} {currency}",
    payNote: "Pagamento sicuro con carta o Apple Pay",
    ownerWillReply: "Il proprietario vi contatterà al più presto.",
    manageBtn: "Gestisci prenotazioni",
    viewListing: "Vedi annuncio completo →",
    footer: "EASY-LOCS® — Gestione immobiliare intelligente",
  },
  pt: {
    ownerTitle: "🏖️ Nova solicitação de reserva",
    ownerSubject: "🏖️ Nova solicitação — {guest}",
    guestSubject: "✅ Sua solicitação de reserva — {property}",
    guestTitle: "✅ Solicitação de reserva recebida",
    guestGreeting: "Olá {name},",
    guestBody: "Sua solicitação de reserva para <strong>{property}</strong> foi registrada.",
    arrival: "Chegada", departure: "Saída", duration: "Duração", total: "Total",
    nightLabel: "noite", nightsLabel: "noites",
    traveler: "Viajante", email: "Email", phone: "Telefone", property: "Imóvel",
    dates: "Datas", amount: "Valor", message: "Mensagem",
    payBtn: "💳 Pagar {amount} {currency}",
    payNote: "Pagamento seguro por cartão ou Apple Pay",
    ownerWillReply: "O proprietário entrará em contato em breve.",
    manageBtn: "Gerenciar reservas",
    viewListing: "Ver anúncio completo →",
    footer: "EASY-LOCS® — Gestão imobiliária inteligente",
  },
  nl: {
    ownerTitle: "🏖️ Nieuwe boekingsaanvraag",
    ownerSubject: "🏖️ Nieuwe aanvraag — {guest}",
    guestSubject: "✅ Uw boekingsaanvraag — {property}",
    guestTitle: "✅ Boekingsaanvraag ontvangen",
    guestGreeting: "Hallo {name},",
    guestBody: "Uw boekingsaanvraag voor <strong>{property}</strong> is geregistreerd.",
    arrival: "Aankomst", departure: "Vertrek", duration: "Duur", total: "Totaal",
    nightLabel: "nacht", nightsLabel: "nachten",
    traveler: "Reiziger", email: "E-mail", phone: "Telefoon", property: "Woning",
    dates: "Data", amount: "Bedrag", message: "Bericht",
    payBtn: "💳 Betaal {amount} {currency}",
    payNote: "Veilige betaling per kaart of Apple Pay",
    ownerWillReply: "De eigenaar neemt snel contact met u op.",
    manageBtn: "Boekingen beheren",
    viewListing: "Bekijk volledige advertentie →",
    footer: "EASY-LOCS® — Slim vastgoedbeheer",
  },
};

function getLocale(country: string) {
  const cfg = COUNTRY_LOCALE[country] || COUNTRY_LOCALE.FR;
  const strings = i18n[cfg.lang] || i18n.fr;
  return { ...cfg, strings };
}

/** HTML-escape user-supplied strings to prevent injection in email templates */
const esc = (s: string | null | undefined): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function tpl(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template);
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const { booking_request_id } = await req.json();
    if (!booking_request_id) throw new Error("booking_request_id required");

    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(booking_request_id)) throw new Error("Invalid booking_request_id format");

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Security: verify the booking was created very recently (within 2 minutes)
    const { data: recentCheck } = await supabase
      .from("bookings")
      .select("id, created_at, notified_at")
      .eq("id", booking_request_id)
      .is("notified_at", null)
      .gte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
      .maybeSingle();

    if (!recentCheck) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: booking not found or already notified" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    const { data: br, error: brErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_request_id)
      .single();
    if (brErr || !br) throw new Error("Booking request not found");

    // Second idempotency layer: check notified_at on the booking itself
    if (br.notified_at) {
      return new Response(JSON.stringify({ skipped: true, reason: "already_notified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Mark as notified immediately to prevent race conditions
    await supabase
      .from("bookings")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", booking_request_id)
      .is("notified_at", null);

    const { data: listing } = await supabase
      .from("public_listings")
      .select("title, price_per_night, slug, contact_email")
      .eq("id", br.listing_id)
      .single();

    const { data: property } = await supabase
      .from("properties")
      .select("label, address, city, country, photo_urls")
      .eq("id", br.property_id)
      .single();

    const { data: org } = await supabase
      .from("orgs")
      .select("owner_user_id, email, name, stripe_account_id, stripe_onboarding_complete")
      .eq("id", br.org_id)
      .single();

    // Resolve locale from property country
    const locale = getLocale(property?.country || "FR");
    const t = locale.strings;

    const nights = Math.ceil(
      (new Date(br.check_out).getTime() - new Date(br.check_in).getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalPrice = nights * (listing?.price_per_night || 0);
    const propertyLabel = listing?.title || property?.label || "Logement";
    const nightsWord = nights > 1 ? t.nightsLabel : t.nightLabel;

    const photoUrls: string[] = Array.isArray(property?.photo_urls) ? property.photo_urls : [];
    const mainPhoto = photoUrls.length > 0 ? photoUrls[0] : "";
    const listingUrl = listing?.slug ? `https://www.easy-locs.com/listing/${listing.slug}` : "";

    // Deep-link to owner's seasonal page with booking focus
    const ownerDeepLink = `/dashboard/seasonal?booking=${br.id}`;
    const appBaseUrl = "https://www.easy-locs.com";

    // Escape all user-supplied values for safe HTML embedding
    const safeGuestName = esc(br.guest_name);
    const safeGuestEmail = esc(br.guest_email);
    const safeGuestPhone = esc(br.guest_phone);
    const safeMessage = esc(br.message);
    const safePropertyLabel = esc(propertyLabel);

    const photoBlock = mainPhoto
      ? `<div style="text-align:center;margin-bottom:20px;">
          <img src="${mainPhoto}" alt="${safePropertyLabel}" style="max-width:100%;height:auto;border-radius:12px;max-height:300px;object-fit:cover;" />
        </div>`
      : "";

    const listingBlock = listingUrl
      ? `<p style="text-align:center;margin:8px 0 16px;">
          <a href="${listingUrl}" style="color:#2563eb;font-size:13px;text-decoration:underline;">${t.viewListing}</a>
        </p>`
      : "";

    // ═══════════════════════════════════════════════════════
    // 1. OWNER NOTIFICATION (in-app) — always created
    // ═══════════════════════════════════════════════════════
    if (org?.owner_user_id) {
      const notifMeta = {
        target_type: "booking_request",
        target_id: br.id,
        booking_id: br.id,
        country_code: property?.country || "",
        org_id: br.org_id,
        target_url: ownerDeepLink,
        module: "seasonal",
      };

      try {
        await supabase.from("notifications").insert({
          user_id: org.owner_user_id,
          org_id: br.org_id,
          type: "info",
          title: tpl(t.ownerSubject, { guest: safeGuestName }),
          message: `${safeGuestName} wants to book "${safePropertyLabel}" from ${br.check_in} to ${br.check_out} (${nights} ${nightsWord}).`,
          link: ownerDeepLink,
          metadata_json: notifMeta,
        });
        console.log("[notify-booking] ✓ Owner notification created");
      } catch (e) {
        console.error("[notify-booking] Owner notification failed:", e);
      }
    }

    // ═══════════════════════════════════════════════════════
    // 2. COMMUNICATION CENTER — create message thread
    // ═══════════════════════════════════════════════════════
    try {
      const messageContent = br.message
        ? `${safeGuestName} wants to book "${safePropertyLabel}" from ${br.check_in} to ${br.check_out} (${nights} ${nightsWord}).\n\nMessage: ${esc(br.message)}\n\n[Booking: ${br.id}]`
        : `${safeGuestName} wants to book "${safePropertyLabel}" from ${br.check_in} to ${br.check_out} (${nights} ${nightsWord}).\n\n[Booking: ${br.id}]`;

      await supabase.from("chat_messages_v2").insert({
        conversation_id: br.id,
        sender_user_id: null,
        sender_orbit_id: null,
        type: "text",
        body: messageContent,
        metadata: {
          org_id: br.org_id,
          category: "booking",
          context_type: "seasonal_booking",
          context_id: br.id,
          contact_name: br.guest_name,
          contact_email: br.guest_email,
        },
      });
      console.log("[notify-booking] ✓ Communication center message created");
    } catch (e) {
      console.error("[notify-booking] Comm center message failed:", e);
    }

    // ═══════════════════════════════════════════════════════
    // 3. OWNER EMAIL — resolve email from listing or org
    // ═══════════════════════════════════════════════════════
    const ownerEmail = (listing as any)?.contact_email || org?.email;
    if (ownerEmail && SENDGRID_API_KEY) {
      try {
        const ownerManageUrl = `${appBaseUrl}${ownerDeepLink}`;
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: ownerEmail }] }],
            from: { email: "noreply@easy-locs.com", name: "Easy-Locs" },
            subject: tpl(t.ownerSubject, { guest: br.guest_name }),
            content: [{
              type: "text/html",
              value: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
                <!-- Header -->
                <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
                  <h1 style="color:#ffffff;font-size:22px;margin:0;">${t.ownerTitle}</h1>
                </div>
                <div style="padding:24px;">
                  ${photoBlock}
                  <!-- Booking ticket card -->
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:16px 0;">
                    <div style="background:linear-gradient(135deg,#d4a853,#c49a42);padding:10px 16px;">
                      <span style="color:#fff;font-weight:700;font-size:13px;">🎫 NEW BOOKING REQUEST</span>
                    </div>
                    <table style="width:100%;border-collapse:collapse;">
                      <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f0f0f0;">${t.traveler}</td><td style="padding:12px 16px;font-weight:700;font-size:14px;color:#1e293b;border-bottom:1px solid #f0f0f0;">${safeGuestName}</td></tr>
                      <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f0f0f0;">${t.email}</td><td style="padding:12px 16px;font-size:13px;color:#1e293b;border-bottom:1px solid #f0f0f0;">${safeGuestEmail}</td></tr>
                      ${br.guest_phone ? `<tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f0f0f0;">${t.phone}</td><td style="padding:12px 16px;font-size:13px;color:#1e293b;border-bottom:1px solid #f0f0f0;">${safeGuestPhone}</td></tr>` : ""}
                      <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f0f0f0;">${t.property}</td><td style="padding:12px 16px;font-size:13px;color:#1e293b;border-bottom:1px solid #f0f0f0;">${safePropertyLabel}</td></tr>
                      <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f0f0f0;">📅 ${t.arrival}</td><td style="padding:12px 16px;font-weight:600;font-size:14px;color:#1e293b;border-bottom:1px solid #f0f0f0;">${br.check_in}</td></tr>
                      <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f0f0f0;">📅 ${t.departure}</td><td style="padding:12px 16px;font-weight:600;font-size:14px;color:#1e293b;border-bottom:1px solid #f0f0f0;">${br.check_out}</td></tr>
                      <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f0f0f0;">🌙 ${t.duration}</td><td style="padding:12px 16px;font-size:13px;color:#1e293b;border-bottom:1px solid #f0f0f0;">${nights} ${nightsWord}</td></tr>
                      ${totalPrice > 0 ? `<tr><td style="padding:12px 16px;color:#64748b;font-size:13px;">${t.total}</td><td style="padding:12px 16px;font-weight:800;font-size:18px;color:#16a34a;">${totalPrice} ${locale.currency}</td></tr>` : ""}
                      ${br.message ? `<tr><td style="padding:12px 16px;color:#64748b;font-size:13px;">${t.message}</td><td style="padding:12px 16px;font-size:13px;color:#1e293b;">${safeMessage}</td></tr>` : ""}
                    </table>
                  </div>
                  <div style="text-align:center;margin:24px 0;">
                    <a href="${ownerManageUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4a853,#c49a42);color:#1a1a1a;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(212,168,83,0.3);">${t.manageBtn}</a>
                  </div>
                </div>
                <div style="background:#f8fafc;padding:16px 24px;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0;text-align:center;">
                  <p style="color:#94a3b8;font-size:11px;margin:0;">${t.footer}</p>
                </div>
              </div>`,
            }],
          }),
        });
        console.log("[notify-booking] ✓ Owner email sent to", ownerEmail);
      } catch (e) {
        console.error("[notify-booking] Owner email failed:", e);
      }
    } else {
      console.warn("[notify-booking] No owner email available or SENDGRID_API_KEY missing. ownerEmail:", ownerEmail, "SENDGRID:", !!SENDGRID_API_KEY);
    }

    // ═══════════════════════════════════════════════════════
    // 4. GUEST EMAIL (localized confirmation + payment link)
    // ═══════════════════════════════════════════════════════

    // Generate payment link
    let paymentUrl = "";
    if (totalPrice > 0) {
      const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-booking-payment`;
      try {
        const payRes = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            booking_request_id: br.id,
            listing_id: br.listing_id,
            guest_email: br.guest_email,
            guest_name: br.guest_name,
            amount: totalPrice,
            nights,
            property_label: propertyLabel,
            origin: "https://www.easy-locs.com",
          }),
        });
        const payData = await payRes.json();
        if (payData.url) paymentUrl = payData.url;
      } catch (e) {
        console.error("Failed to generate payment link:", e);
      }
    }

    if (br.guest_email && SENDGRID_API_KEY) {
      const paymentSection = paymentUrl
        ? `<div style="text-align:center;margin:28px 0;">
            <a href="${paymentUrl}" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 14px rgba(22,163,74,0.3);">${tpl(t.payBtn, { amount: totalPrice, currency: locale.currency })}</a>
            <p style="color:#888;font-size:12px;margin-top:10px;">${t.payNote}</p>
          </div>`
        : "";

      // Build guest reply link for bidirectional messaging
      const guestReplyUrl = `${appBaseUrl}/guest/booking/${br.id}/reply`;

      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: br.guest_email }] }],
          from: { email: "noreply@easy-locs.com", name: org?.name || "Easy-Locs" },
          reply_to: { email: org?.email || "contact@easy-locs.com", name: org?.name || "Easy-Locs" },
          subject: tpl(t.guestSubject, { property: safePropertyLabel }),
          content: [{
            type: "text/html",
            value: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
              <!-- Header banner -->
              <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">${t.guestTitle}</h1>
                <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0;">${tpl(t.guestGreeting, { name: safeGuestName })}</p>
              </div>

              <div style="padding:24px;">
                ${photoBlock ? `<div style="margin:-48px 0 20px;text-align:center;position:relative;z-index:1;">
                  <img src="${mainPhoto}" alt="${safePropertyLabel}" style="max-width:100%;height:auto;border-radius:12px;max-height:250px;object-fit:cover;border:4px solid #fff;box-shadow:0 8px 32px rgba(0,0,0,0.12);" />
                </div>` : ''}

                <p style="color:#555;font-size:15px;line-height:1.6;margin-bottom:20px;">${tpl(t.guestBody, { property: safePropertyLabel })}</p>

                ${listingBlock}

                <!-- Booking ticket card -->
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0;">
                  <div style="background:linear-gradient(135deg,#d4a853,#c49a42);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
                    <span style="color:#fff;font-weight:700;font-size:14px;">🎫 ${t.property}: ${safePropertyLabel}</span>
                  </div>
                  <table style="width:100%;border-collapse:collapse;">
                    <tr>
                      <td style="padding:14px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f0f0f0;width:40%;">📅 ${t.arrival}</td>
                      <td style="padding:14px 16px;font-weight:700;font-size:14px;color:#1e293b;border-bottom:1px solid #f0f0f0;">${br.check_in}</td>
                    </tr>
                    <tr>
                      <td style="padding:14px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f0f0f0;">📅 ${t.departure}</td>
                      <td style="padding:14px 16px;font-weight:700;font-size:14px;color:#1e293b;border-bottom:1px solid #f0f0f0;">${br.check_out}</td>
                    </tr>
                    <tr>
                      <td style="padding:14px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f0f0f0;">🌙 ${t.duration}</td>
                      <td style="padding:14px 16px;font-size:14px;color:#1e293b;border-bottom:1px solid #f0f0f0;">${nights} ${nightsWord}</td>
                    </tr>
                    ${totalPrice > 0 ? `<tr>
                      <td style="padding:14px 16px;color:#64748b;font-size:13px;">💰 ${t.total}</td>
                      <td style="padding:14px 16px;font-weight:800;font-size:18px;color:#16a34a;">${totalPrice} ${locale.currency}</td>
                    </tr>` : ""}
                  </table>
                </div>

                <!-- Booking reference -->
                <div style="text-align:center;margin:16px 0;">
                  <span style="display:inline-block;background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:8px;padding:8px 20px;font-family:monospace;font-size:12px;color:#64748b;letter-spacing:1px;">
                    REF: ${br.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                ${paymentSection}

                <p style="color:#94a3b8;font-size:13px;text-align:center;margin:20px 0;">${t.ownerWillReply}</p>

                <!-- Reply button -->
                <div style="text-align:center;margin:24px 0;">
                  <a href="${guestReplyUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4a853,#c49a42);color:#1a1a1a;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(212,168,83,0.3);">💬 Reply to your host</a>
                </div>
              </div>

              <!-- Footer -->
              <div style="background:#f8fafc;padding:20px 24px;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0;text-align:center;">
                <p style="color:#94a3b8;font-size:11px;margin:0;">${t.footer}</p>
              </div>
            </div>`,
          }],
        }),
      });
      console.log("[notify-booking] ✓ Guest email sent to", br.guest_email);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[NOTIFY-BOOKING] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
