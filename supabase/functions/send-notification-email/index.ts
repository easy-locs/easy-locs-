import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface EmailRequest {
  event_type: "new_tenant" | "rent_due" | "payment_received" | "receipt_ready" | "lease_signed" | "intervention" | "booking_request" | "dunning";
  recipient_email: string;
  recipient_name?: string;
  data: Record<string, any>;
  locale?: string;
}

const TEMPLATES: Record<string, Record<string, { subject: string; title: string; body: string }>> = {
  new_tenant: {
    fr: { subject: "Bienvenue — Accédez à votre espace locataire", title: "🏠 Bienvenue sur Easy-Locs", body: "Votre espace locataire est prêt. Connectez-vous pour accéder à vos documents, payer votre loyer et communiquer avec votre bailleur." },
    en: { subject: "Welcome — Access your tenant portal", title: "🏠 Welcome to Easy-Locs", body: "Your tenant portal is ready. Log in to access your documents, pay rent and communicate with your landlord." },
    es: { subject: "Bienvenido — Acceda a su portal de inquilino", title: "🏠 Bienvenido a Easy-Locs", body: "Su portal de inquilino está listo. Inicie sesión para acceder a sus documentos, pagar el alquiler y comunicarse con su arrendador." },
    de: { subject: "Willkommen — Zugang zu Ihrem Mieterportal", title: "🏠 Willkommen bei Easy-Locs", body: "Ihr Mieterportal ist bereit. Melden Sie sich an, um auf Ihre Dokumente zuzugreifen, Miete zu zahlen und mit Ihrem Vermieter zu kommunizieren." },
    it: { subject: "Benvenuto — Accedi al tuo portale inquilino", title: "🏠 Benvenuto su Easy-Locs", body: "Il tuo portale inquilino è pronto. Accedi per consultare i tuoi documenti, pagare l'affitto e comunicare con il tuo locatore." },
    pt: { subject: "Bem-vindo — Acesse seu portal de inquilino", title: "🏠 Bem-vindo ao Easy-Locs", body: "Seu portal de inquilino está pronto. Faça login para acessar seus documentos, pagar o aluguel e se comunicar com seu proprietário." },
  },
  rent_due: {
    fr: { subject: "Appel de loyer — {month}", title: "🏠 Appel de loyer", body: "Votre loyer du mois de {month} est dû. Montant total : {amount}." },
    en: { subject: "Rent Due — {month}", title: "🏠 Rent Due", body: "Your rent for {month} is due. Total amount: {amount}." },
    es: { subject: "Alquiler pendiente — {month}", title: "🏠 Alquiler pendiente", body: "Su alquiler de {month} está pendiente. Monto total: {amount}." },
    de: { subject: "Miete fällig — {month}", title: "🏠 Miete fällig", body: "Ihre Miete für {month} ist fällig. Gesamtbetrag: {amount}." },
    it: { subject: "Affitto dovuto — {month}", title: "🏠 Affitto dovuto", body: "Il suo affitto per {month} è dovuto. Importo totale: {amount}." },
    pt: { subject: "Aluguel devido — {month}", title: "🏠 Aluguel devido", body: "Seu aluguel de {month} está vencido. Valor total: {amount}." },
  },
  payment_received: {
    fr: { subject: "Paiement reçu — {month}", title: "💰 Paiement confirmé", body: "Le paiement du loyer de {month} a été enregistré. Montant : {amount}." },
    en: { subject: "Payment Received — {month}", title: "💰 Payment Confirmed", body: "Rent payment for {month} has been recorded. Amount: {amount}." },
    es: { subject: "Pago recibido — {month}", title: "💰 Pago confirmado", body: "El pago del alquiler de {month} ha sido registrado. Monto: {amount}." },
    de: { subject: "Zahlung erhalten — {month}", title: "💰 Zahlung bestätigt", body: "Die Mietzahlung für {month} wurde verbucht. Betrag: {amount}." },
    it: { subject: "Pagamento ricevuto — {month}", title: "💰 Pagamento confermato", body: "Il pagamento dell'affitto di {month} è stato registrato. Importo: {amount}." },
    pt: { subject: "Pagamento recebido — {month}", title: "💰 Pagamento confirmado", body: "O pagamento do aluguel de {month} foi registrado. Valor: {amount}." },
  },
  receipt_ready: {
    fr: { subject: "Votre quittance est disponible — {month}", title: "📄 Quittance disponible", body: "Votre quittance de loyer pour {month} est disponible dans votre espace locataire." },
    en: { subject: "Your receipt is ready — {month}", title: "📄 Receipt Ready", body: "Your rent receipt for {month} is available in your tenant portal." },
    es: { subject: "Su recibo está disponible — {month}", title: "📄 Recibo disponible", body: "Su recibo de alquiler de {month} está disponible en su portal de inquilino." },
    de: { subject: "Ihre Quittung ist bereit — {month}", title: "📄 Quittung verfügbar", body: "Ihre Mietquittung für {month} ist in Ihrem Mieterportal verfügbar." },
    it: { subject: "La tua ricevuta è pronta — {month}", title: "📄 Ricevuta disponibile", body: "La tua ricevuta d'affitto per {month} è disponibile nel tuo portale inquilino." },
    pt: { subject: "Seu recibo está disponível — {month}", title: "📄 Recibo disponível", body: "Seu recibo de aluguel de {month} está disponível no seu portal de inquilino." },
  },
  lease_signed: {
    fr: { subject: "Bail signé — {property}", title: "📝 Bail signé", body: "Le bail pour {property} a été signé par toutes les parties." },
    en: { subject: "Lease Signed — {property}", title: "📝 Lease Signed", body: "The lease for {property} has been signed by all parties." },
    es: { subject: "Contrato firmado — {property}", title: "📝 Contrato firmado", body: "El contrato de {property} ha sido firmado por todas las partes." },
    de: { subject: "Mietvertrag unterzeichnet — {property}", title: "📝 Mietvertrag unterzeichnet", body: "Der Mietvertrag für {property} wurde von allen Parteien unterzeichnet." },
    it: { subject: "Contratto firmato — {property}", title: "📝 Contratto firmato", body: "Il contratto per {property} è stato firmato da tutte le parti." },
    pt: { subject: "Contrato assinado — {property}", title: "📝 Contrato assinado", body: "O contrato de {property} foi assinado por todas as partes." },
  },
  intervention: {
    fr: { subject: "Nouvelle intervention — {title}", title: "🔧 Intervention signalée", body: "Une nouvelle intervention a été créée : {title}. Priorité : {priority}." },
    en: { subject: "New Intervention — {title}", title: "🔧 Intervention Reported", body: "A new intervention has been created: {title}. Priority: {priority}." },
    es: { subject: "Nueva intervención — {title}", title: "🔧 Intervención reportada", body: "Se ha creado una nueva intervención: {title}. Prioridad: {priority}." },
    de: { subject: "Neue Intervention — {title}", title: "🔧 Intervention gemeldet", body: "Eine neue Intervention wurde erstellt: {title}. Priorität: {priority}." },
    it: { subject: "Nuovo intervento — {title}", title: "🔧 Intervento segnalato", body: "È stato creato un nuovo intervento: {title}. Priorità: {priority}." },
    pt: { subject: "Nova intervenção — {title}", title: "🔧 Intervenção reportada", body: "Uma nova intervenção foi criada: {title}. Prioridade: {priority}." },
  },
  booking_request: {
    fr: { subject: "Nouvelle demande de réservation", title: "📩 Demande de réservation", body: "{guest_name} souhaite réserver du {check_in} au {check_out}." },
    en: { subject: "New Booking Request", title: "📩 Booking Request", body: "{guest_name} wants to book from {check_in} to {check_out}." },
    es: { subject: "Nueva solicitud de reserva", title: "📩 Solicitud de reserva", body: "{guest_name} quiere reservar del {check_in} al {check_out}." },
    de: { subject: "Neue Buchungsanfrage", title: "📩 Buchungsanfrage", body: "{guest_name} möchte vom {check_in} bis {check_out} buchen." },
    it: { subject: "Nuova richiesta di prenotazione", title: "📩 Richiesta di prenotazione", body: "{guest_name} vuole prenotare dal {check_in} al {check_out}." },
    pt: { subject: "Nova solicitação de reserva", title: "📩 Solicitação de reserva", body: "{guest_name} quer reservar de {check_in} a {check_out}." },
  },
  dunning: {
    fr: { subject: "Relance de loyer impayé — {month}", title: "⚠️ Relance de loyer", body: "Le loyer du mois de {month} reste impayé. Montant dû : {amount}. Merci de régulariser rapidement." },
    en: { subject: "Unpaid Rent Reminder — {month}", title: "⚠️ Rent Reminder", body: "Rent for {month} remains unpaid. Amount due: {amount}. Please settle promptly." },
    es: { subject: "Recordatorio de alquiler impago — {month}", title: "⚠️ Recordatorio de alquiler", body: "El alquiler de {month} sigue impago. Monto adeudado: {amount}. Regularice lo antes posible." },
    de: { subject: "Mietrückstand — {month}", title: "⚠️ Mietrückstand", body: "Die Miete für {month} ist noch offen. Fälliger Betrag: {amount}. Bitte begleichen Sie umgehend." },
    it: { subject: "Sollecito affitto non pagato — {month}", title: "⚠️ Sollecito affitto", body: "L'affitto di {month} è ancora non pagato. Importo dovuto: {amount}. Si prega di regolarizzare." },
    pt: { subject: "Lembrete de aluguel em atraso — {month}", title: "⚠️ Lembrete de aluguel", body: "O aluguel de {month} continua em aberto. Valor devido: {amount}. Favor regularizar." },
  },
};

function interpolate(text: string, data: Record<string, any>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => data[key]?.toString() ?? "");
}

function sanitizeHtml(text: string): string {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/on\w+\s*=/gi, "")
    .replace(/javascript:/gi, "");
}

function buildHtml(title: string, body: string, ctaUrl?: string, ctaLabel?: string): string {
  const safeTitle = sanitizeHtml(title);
  const safeBody = sanitizeHtml(body);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5}
.container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px 24px;text-align:center}
.header h1{color:#fff;font-size:20px;margin:0}
.header .brand{color:#c9a84c;font-size:14px;font-weight:700;letter-spacing:1px;margin-bottom:8px}
.body{padding:32px 24px}
.body p{color:#333;font-size:15px;line-height:1.6;margin:0 0 16px}
.cta{display:inline-block;background:linear-gradient(135deg,#c9a84c,#b8963f);color:#1a1a2e;font-weight:700;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;margin-top:8px}
.footer{padding:24px;text-align:center;color:#999;font-size:12px;border-top:1px solid #eee}
</style></head>
<body><div class="container">
<div class="header"><div class="brand">EASY-LOCS®</div><h1>${safeTitle}</h1></div>
<div class="body"><p>${safeBody}</p>
${ctaUrl ? `<a href="${ctaUrl}" class="cta">${sanitizeHtml(ctaLabel || "Accéder")}</a>` : ""}
</div>
<div class="footer">Cet email est envoyé automatiquement par Easy-Locs®.<br>Ne répondez pas à cet email.</div>
</div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { event_type, recipient_email, recipient_name, data, locale = "fr" } = await req.json() as EmailRequest;

    if (!event_type || !recipient_email) {
      return new Response(JSON.stringify({ error: "Missing event_type or recipient_email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const templateGroup = TEMPLATES[event_type];
    if (!templateGroup) {
      return new Response(JSON.stringify({ error: `Unknown event_type: ${event_type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const template = templateGroup[locale] || templateGroup["fr"];
    const subject = interpolate(template.subject, data);
    const title = interpolate(template.title, data);
    const body = interpolate(template.body, data);

    const ctaUrl = data.cta_url || undefined;
    const ctaLabel = data.cta_label || undefined;
    const html = buildHtml(title, body, ctaUrl, ctaLabel);

    if (!SENDGRID_API_KEY) {
      console.log("[send-notification-email] No SendGrid key, logging email:", { to: recipient_email, subject });
      return new Response(JSON.stringify({ success: true, mode: "dry_run", subject }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipient_email, name: recipient_name || "" }] }],
        from: { email: "noreply@easy-locs.com", name: "Easy-Locs" },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (!sgRes.ok) {
      const errText = await sgRes.text();
      console.error("[send-notification-email] SendGrid error:", errText);
      return new Response(JSON.stringify({ error: "Email send failed", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log in audit
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabaseAdmin.from("audit_logs").insert({
      action: `email_sent:${event_type}`,
      metadata_json: { recipient_email, subject, locale },
    });

    return new Response(JSON.stringify({ success: true, subject }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-notification-email] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
