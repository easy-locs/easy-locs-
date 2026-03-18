/**
 * rent-reminders — Automated late payment reminder system.
 * 
 * Runs on schedule (daily via cron) or manually.
 * Checks all unpaid rent_calls and sends reminders based on days overdue:
 *   D+3  → Friendly reminder
 *   D+7  → Firm reminder
 *   D+15 → Formal overdue notice
 *   D+30 → Escalation warning
 * 
 * Messages are sent in the tenant's preferred language.
 */

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Reminder thresholds in days
const REMINDER_LEVELS = [
  { days: 3, level: 1, severity: "friendly" },
  { days: 7, level: 2, severity: "firm" },
  { days: 15, level: 3, severity: "formal" },
  { days: 30, level: 4, severity: "escalation" },
] as const;

// Localized reminder templates
const REMINDER_TEMPLATES: Record<string, Record<number, { subject: string; title: string; body: string }>> = {
  fr: {
    1: { subject: "🔔 Rappel de loyer — {month}", title: "Rappel de paiement", body: "Nous vous rappelons que votre loyer de {amount} pour {month} n'a pas encore été réglé. Merci de procéder au paiement dans les meilleurs délais." },
    2: { subject: "⚠️ Loyer impayé — {month}", title: "Second rappel de paiement", body: "Votre loyer de {amount} pour {month} reste impayé depuis 7 jours. Nous vous prions de régulariser votre situation rapidement." },
    3: { subject: "🚨 Mise en demeure — Loyer {month}", title: "Avis de retard de paiement", body: "Votre loyer de {amount} pour {month} est en retard de 15 jours. Cette notification constitue un avis formel. Veuillez régler sous 48h pour éviter des frais supplémentaires." },
    4: { subject: "❗ Procédure en cours — Loyer {month}", title: "Dernier avertissement", body: "Votre loyer de {amount} pour {month} est impayé depuis 30 jours. Sans régularisation immédiate, des mesures seront engagées conformément aux termes du bail." },
  },
  en: {
    1: { subject: "🔔 Rent reminder — {month}", title: "Payment reminder", body: "This is a friendly reminder that your rent of {amount} for {month} has not been received. Please make payment at your earliest convenience." },
    2: { subject: "⚠️ Overdue rent — {month}", title: "Second payment reminder", body: "Your rent of {amount} for {month} remains unpaid for 7 days. Please settle your account promptly." },
    3: { subject: "🚨 Formal notice — Rent {month}", title: "Late payment notice", body: "Your rent of {amount} for {month} is 15 days overdue. This is a formal notice. Please pay within 48 hours to avoid additional charges." },
    4: { subject: "❗ Action required — Rent {month}", title: "Final warning", body: "Your rent of {amount} for {month} has been unpaid for 30 days. Immediate payment is required to avoid legal proceedings as per your lease terms." },
  },
  es: {
    1: { subject: "🔔 Recordatorio de alquiler — {month}", title: "Recordatorio de pago", body: "Le recordamos que su alquiler de {amount} correspondiente a {month} no ha sido recibido. Por favor, realice el pago a la mayor brevedad." },
    2: { subject: "⚠️ Alquiler impago — {month}", title: "Segundo recordatorio", body: "Su alquiler de {amount} de {month} sigue impago desde hace 7 días. Le rogamos regularice su situación." },
    3: { subject: "🚨 Aviso formal — Alquiler {month}", title: "Aviso de impago", body: "Su alquiler de {amount} de {month} lleva 15 días de retraso. Este es un aviso formal. Pague en 48h para evitar recargos." },
    4: { subject: "❗ Procedimiento iniciado — Alquiler {month}", title: "Último aviso", body: "Su alquiler de {amount} de {month} lleva 30 días impago. Sin pago inmediato, se iniciarán las acciones previstas en el contrato." },
  },
  de: {
    1: { subject: "🔔 Mieterinnerung — {month}", title: "Zahlungserinnerung", body: "Wir möchten Sie daran erinnern, dass Ihre Miete von {amount} für {month} noch nicht eingegangen ist. Bitte überweisen Sie zeitnah." },
    2: { subject: "⚠️ Offene Miete — {month}", title: "Zweite Mahnung", body: "Ihre Miete von {amount} für {month} ist seit 7 Tagen ausstehend. Bitte begleichen Sie den Betrag umgehend." },
    3: { subject: "🚨 Formelle Mahnung — Miete {month}", title: "Zahlungsverzug", body: "Ihre Miete von {amount} für {month} ist 15 Tage überfällig. Dies ist eine formelle Mahnung. Bitte zahlen Sie innerhalb von 48 Stunden." },
    4: { subject: "❗ Letzte Mahnung — Miete {month}", title: "Letzte Warnung", body: "Ihre Miete von {amount} für {month} ist seit 30 Tagen unbezahlt. Ohne sofortige Zahlung werden rechtliche Schritte eingeleitet." },
  },
  it: {
    1: { subject: "🔔 Promemoria affitto — {month}", title: "Promemoria di pagamento", body: "Le ricordiamo che l'affitto di {amount} per {month} non è stato ancora ricevuto. La preghiamo di effettuare il pagamento." },
    2: { subject: "⚠️ Affitto scaduto — {month}", title: "Secondo sollecito", body: "Il suo affitto di {amount} per {month} risulta scaduto da 7 giorni. La preghiamo di regolarizzare la sua posizione." },
    3: { subject: "🚨 Avviso formale — Affitto {month}", title: "Avviso di mora", body: "Il suo affitto di {amount} per {month} è in ritardo di 15 giorni. Questo è un avviso formale. Paghi entro 48 ore." },
    4: { subject: "❗ Procedura avviata — Affitto {month}", title: "Ultimo avviso", body: "Il suo affitto di {amount} per {month} è scaduto da 30 giorni. Senza pagamento immediato, verranno avviate le procedure previste dal contratto." },
  },
  pt: {
    1: { subject: "🔔 Lembrete de aluguel — {month}", title: "Lembrete de pagamento", body: "Lembramos que o seu aluguel de {amount} referente a {month} ainda não foi recebido. Por favor, efetue o pagamento." },
    2: { subject: "⚠️ Aluguel em atraso — {month}", title: "Segundo lembrete", body: "Seu aluguel de {amount} de {month} está em atraso há 7 dias. Regularize sua situação o mais breve possível." },
    3: { subject: "🚨 Aviso formal — Aluguel {month}", title: "Notificação de atraso", body: "Seu aluguel de {amount} de {month} está 15 dias atrasado. Este é um aviso formal. Pague em até 48h." },
    4: { subject: "❗ Última notificação — Aluguel {month}", title: "Último aviso", body: "Seu aluguel de {amount} de {month} está 30 dias atrasado. Sem pagamento imediato, medidas legais serão tomadas." },
  },
  ar: {
    1: { subject: "🔔 تذكير بالإيجار — {month}", title: "تذكير بالدفع", body: "نذكّرك بأن إيجارك البالغ {amount} عن شهر {month} لم يُستلم بعد. يرجى الدفع في أقرب وقت." },
    2: { subject: "⚠️ إيجار متأخر — {month}", title: "تذكير ثانٍ", body: "إيجارك البالغ {amount} عن {month} متأخر منذ 7 أيام. يرجى تسوية حسابك." },
    3: { subject: "🚨 إشعار رسمي — إيجار {month}", title: "إشعار تأخير", body: "إيجارك البالغ {amount} عن {month} متأخر 15 يوماً. هذا إشعار رسمي. يرجى الدفع خلال 48 ساعة." },
    4: { subject: "❗ إجراء قانوني — إيجار {month}", title: "تحذير أخير", body: "إيجارك البالغ {amount} عن {month} متأخر 30 يوماً. بدون دفع فوري، سيتم اتخاذ إجراءات قانونية." },
  },
};

function getTemplate(locale: string, level: number) {
  const lang = locale.slice(0, 2);
  return REMINDER_TEMPLATES[lang]?.[level] || REMINDER_TEMPLATES.en[level];
}

function fillTemplate(template: { subject: string; title: string; body: string }, vars: Record<string, string>) {
  const fill = (s: string) => Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), s);
  return { subject: fill(template.subject), title: fill(template.title), body: fill(template.body) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const now = new Date();
  const results = { checked: 0, reminders_sent: 0, errors: 0 };

  try {
    // Fetch all unpaid rent calls with tenant + property info
    const { data: unpaidCalls, error: fetchErr } = await supabase
      .from("rent_calls")
      .select(`
        id, month, rent_amount, charges_amount, total_amount,
        tenant_id, property_id, org_id, due_date,
        reminder_level, last_reminder_at
      `)
      .eq("paid", false)
      .order("month", { ascending: true });

    if (fetchErr) throw fetchErr;
    if (!unpaidCalls?.length) {
      return new Response(JSON.stringify({ ...results, message: "No unpaid rent calls" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    results.checked = unpaidCalls.length;

    // Batch-load tenants and properties
    const tenantIds = [...new Set(unpaidCalls.map(r => r.tenant_id).filter(Boolean))];
    const propertyIds = [...new Set(unpaidCalls.map(r => r.property_id).filter(Boolean))];

    const [{ data: tenants }, { data: properties }] = await Promise.all([
      supabase.from("tenants").select("id, name, email, preferred_locale, tenant_user_id").in("id", tenantIds),
      supabase.from("properties").select("id, label, country, currency").in("id", propertyIds),
    ]);

    const tenantMap = new Map((tenants || []).map(t => [t.id, t]));
    const propMap = new Map((properties || []).map(p => [p.id, p]));

    for (const rc of unpaidCalls) {
      try {
        const tenant = tenantMap.get(rc.tenant_id);
        const property = propMap.get(rc.property_id);
        if (!tenant?.email) continue;

        // Calculate days overdue from due_date or month start
        const dueDate = rc.due_date
          ? new Date(rc.due_date)
          : new Date(rc.month + "-01"); // e.g., "2026-03-01"
        
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysOverdue < 3) continue; // Not yet overdue enough

        // Find the appropriate reminder level
        const applicableLevel = REMINDER_LEVELS
          .filter(l => daysOverdue >= l.days)
          .sort((a, b) => b.days - a.days)[0];

        if (!applicableLevel) continue;

        // Skip if already sent this level
        const currentLevel = rc.reminder_level || 0;
        if (currentLevel >= applicableLevel.level) continue;

        // Skip if last reminder was sent less than 24h ago
        if (rc.last_reminder_at) {
          const lastSent = new Date(rc.last_reminder_at);
          const hoursSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 24) continue;
        }

        // Determine tenant language
        const tenantLocale = tenant.preferred_locale || 
          (property?.country ? getDefaultLocale(property.country) : "en");

        const currency = property?.currency || "EUR";
        const amount = formatAmount(rc.total_amount || 0, currency);

        const template = getTemplate(tenantLocale, applicableLevel.level);
        const filled = fillTemplate(template, {
          month: rc.month,
          amount,
          property: property?.label || "",
        });

        // 1. Send email notification
        await supabase.functions.invoke("send-notification-email", {
          body: {
            event_type: "rent_reminder",
            recipient_email: tenant.email,
            recipient_name: tenant.name || "",
            data: {
              subject: filled.subject,
              message: filled.body,
              service_title: property?.label || "",
              booking_id: rc.id,
              cta_url: `https://easy-locs.lovable.app/tenant/pay`,
              cta_label: tenantLocale.startsWith("fr") ? "Payer maintenant" :
                         tenantLocale.startsWith("es") ? "Pagar ahora" :
                         tenantLocale.startsWith("de") ? "Jetzt bezahlen" : "Pay Now",
              org_id: rc.org_id,
            },
            locale: tenantLocale,
          },
        });

        // 2. Create in-app notification for tenant
        if (tenant.tenant_user_id) {
          await supabase.from("notifications").insert({
            user_id: tenant.tenant_user_id,
            org_id: rc.org_id,
            type: "payment",
            title: filled.title,
            message: filled.body.slice(0, 200),
            link: "/tenant/pay",
            metadata_json: {
              target_type: "payment",
              target_id: rc.id,
              country_code: property?.country || "",
              org_id: rc.org_id,
              target_url: "/tenant/pay",
            },
          });
        }

        // 3. Send in-chat message (system message)
        await supabase.from("messages").insert({
          org_id: rc.org_id,
          sender_id: "00000000-0000-0000-0000-000000000000",
          tenant_id: rc.tenant_id,
          content: `⏰ ${filled.title}: ${filled.body.slice(0, 150)}...`,
          category: "payment",
          message_type: "system",
          read: false,
        });

        // 4. Notify landlord
        const { data: org } = await supabase
          .from("orgs")
          .select("owner_user_id")
          .eq("id", rc.org_id)
          .single();

        if (org?.owner_user_id) {
          const ownerTitles: Record<number, string> = {
            1: `🔔 Reminder sent to ${tenant.name} — ${rc.month}`,
            2: `⚠️ 2nd reminder sent to ${tenant.name} — ${rc.month}`,
            3: `🚨 Formal notice sent to ${tenant.name} — ${rc.month}`,
            4: `❗ Escalation notice sent to ${tenant.name} — ${rc.month}`,
          };
          await supabase.from("notifications").insert({
            user_id: org.owner_user_id,
            org_id: rc.org_id,
            type: "payment",
            title: ownerTitles[applicableLevel.level],
            message: `${amount} for ${rc.month} — ${daysOverdue} days overdue`,
            link: `/dashboard/reminders?record=${rc.id}`,
          });
        }

        // 5. Update rent_call with reminder tracking
        await supabase.from("rent_calls").update({
          reminder_level: applicableLevel.level,
          last_reminder_at: now.toISOString(),
        } as any).eq("id", rc.id);

        // 6. Audit log
        await supabase.from("audit_logs").insert({
          user_id: null,
          org_id: rc.org_id,
          action: "rent_reminder_sent",
          metadata_json: {
            rent_call_id: rc.id,
            tenant_id: rc.tenant_id,
            level: applicableLevel.level,
            severity: applicableLevel.severity,
            days_overdue: daysOverdue,
            month: rc.month,
          },
        });

        results.reminders_sent++;
      } catch (err) {
        console.error(`Error processing rent call ${rc.id}:`, err);
        results.errors++;
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("rent-reminders error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getDefaultLocale(country: string): string {
  const map: Record<string, string> = {
    FR: "fr", BE: "fr", ES: "es", IT: "it", DE: "de", PT: "pt",
    GB: "en", US: "en", AE: "ar", SA: "ar", MA: "fr", TN: "fr",
    NL: "nl", AT: "de", CH: "fr", LU: "fr",
  };
  return map[country] || "en";
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
