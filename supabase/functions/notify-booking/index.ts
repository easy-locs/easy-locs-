import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

function tpl(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_request_id } = await req.json();
    if (!booking_request_id) throw new Error("booking_request_id required");

    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(booking_request_id)) throw new Error("Invalid booking_request_id format");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Idempotency check: skip if notification was already sent for this booking
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("type", "info")
      .ilike("message", `%${booking_request_id}%`)
      .limit(1);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "already_notified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: br, error: brErr } = await supabase
      .from("booking_requests")
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
      .from("booking_requests")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", booking_request_id)
      .is("notified_at", null);

    const { data: listing } = await supabase
      .from("public_listings")
      .select("title, price_per_night, slug")
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
    const listingUrl = listing?.slug ? `https://easylocs.lovable.app/listing/${listing.slug}` : "";

    // Deep-link to owner's calendar with focus on this request
    const ownerDeepLink = `/dashboard/seasonal?focusRequest=${br.id}&propertyId=${br.property_id}&month=${br.check_in.slice(0, 7)}`;

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
            origin: "https://easylocs.lovable.app",
          }),
        });
        const payData = await payRes.json();
        if (payData.url) paymentUrl = payData.url;
      } catch (e) {
        console.error("Failed to generate payment link:", e);
      }
    }

    const photoBlock = mainPhoto
      ? `<div style="text-align:center;margin-bottom:20px;">
          <img src="${mainPhoto}" alt="${propertyLabel}" style="max-width:100%;height:auto;border-radius:12px;max-height:300px;object-fit:cover;" />
        </div>`
      : "";

    const listingBlock = listingUrl
      ? `<p style="text-align:center;margin:8px 0 16px;">
          <a href="${listingUrl}" style="color:#2563eb;font-size:13px;text-decoration:underline;">${t.viewListing}</a>
        </p>`
      : "";

    // 1. Notify owner (in-app + email) with deep-link
    if (org?.owner_user_id) {
      await supabase.from("notifications").insert({
        user_id: org.owner_user_id,
        org_id: br.org_id,
        type: "info",
        title: t.ownerTitle,
        message: `${br.guest_name} — ${propertyLabel} — ${br.check_in} → ${br.check_out} (${nights} ${nightsWord}, ${totalPrice}${locale.symbol}).`,
        link: ownerDeepLink,
      });
    }

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

    // Email to owner with deep-link button
    if (org?.email && SENDGRID_API_KEY) {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: org.email }] }],
          from: { email: "noreply@easy-locs.com", name: "Easy-Locs" },
          reply_to: { email: "contact@easy-locs.com", name: "Easy-Locs" },
          subject: tpl(t.ownerSubject, { guest: br.guest_name }),
          content: [{
            type: "text/html",
            value: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
              <div style="text-align:center;margin-bottom:24px;">
                <h1 style="color:#1a1a1a;font-size:22px;">${t.ownerTitle}</h1>
              </div>
              ${photoBlock}
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">${t.traveler}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${br.guest_name}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">${t.email}</td><td style="padding:8px;border-bottom:1px solid #eee;">${br.guest_email}</td></tr>
                ${br.guest_phone ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">${t.phone}</td><td style="padding:8px;border-bottom:1px solid #eee;">${br.guest_phone}</td></tr>` : ""}
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">${t.property}</td><td style="padding:8px;border-bottom:1px solid #eee;">${propertyLabel}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">${t.dates}</td><td style="padding:8px;border-bottom:1px solid #eee;">${br.check_in} → ${br.check_out} (${nights} ${nightsWord})</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">${t.amount}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;color:#16a34a;">${totalPrice} ${locale.currency}</td></tr>
                ${br.message ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">${t.message}</td><td style="padding:8px;border-bottom:1px solid #eee;">${br.message}</td></tr>` : ""}
              </table>
              <p style="text-align:center;margin-top:24px;">
                <a href="https://easylocs.lovable.app${ownerDeepLink}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${t.manageBtn}</a>
              </p>
              <p style="text-align:center;color:#aaa;font-size:11px;margin-top:24px;">${t.footer}</p>
            </div>`,
          }],
        }),
      });
    }

    // 2. Email to guest (localized)
    if (br.guest_email && SENDGRID_API_KEY) {
      const paymentSection = paymentUrl
        ? `<div style="text-align:center;margin:24px 0;">
            <a href="${paymentUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">${tpl(t.payBtn, { amount: totalPrice, currency: locale.currency })}</a>
            <p style="color:#888;font-size:12px;margin-top:8px;">${t.payNote}</p>
          </div>`
        : "";

      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: br.guest_email }] }],
          from: { email: "noreply@easy-locs.com", name: org?.name || "Easy-Locs" },
          reply_to: { email: org?.email || "contact@easy-locs.com", name: org?.name || "Easy-Locs" },
          subject: tpl(t.guestSubject, { property: propertyLabel }),
          content: [{
            type: "text/html",
            value: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
              <div style="text-align:center;margin-bottom:24px;">
                <h1 style="color:#1a1a1a;font-size:22px;">${t.guestTitle}</h1>
              </div>
              ${photoBlock}
              ${listingBlock}
              <p style="color:#555;font-size:15px;">${tpl(t.guestGreeting, { name: br.guest_name })}</p>
              <p style="color:#555;font-size:15px;">${tpl(t.guestBody, { property: propertyLabel })}</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;">
                <tr><td style="padding:10px 12px;color:#888;">${t.arrival}</td><td style="padding:10px 12px;font-weight:600;">${br.check_in}</td></tr>
                <tr><td style="padding:10px 12px;color:#888;">${t.departure}</td><td style="padding:10px 12px;font-weight:600;">${br.check_out}</td></tr>
                <tr><td style="padding:10px 12px;color:#888;">${t.duration}</td><td style="padding:10px 12px;">${nights} ${nightsWord}</td></tr>
                ${totalPrice > 0 ? `<tr><td style="padding:10px 12px;color:#888;">${t.total}</td><td style="padding:10px 12px;font-weight:700;color:#16a34a;">${totalPrice} ${locale.currency}</td></tr>` : ""}
              </table>
              ${paymentSection}
              <p style="color:#888;font-size:13px;text-align:center;">${t.ownerWillReply}</p>
              <p style="text-align:center;color:#aaa;font-size:11px;margin-top:32px;">${t.footer}</p>
            </div>`,
          }],
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, payment_url: paymentUrl }), {
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
