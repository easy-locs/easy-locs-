/**
 * Outreach Message Builder
 * Generates localized outreach messages for merchants.
 */

export interface OutreachMessageParams {
  merchantName: string;
  city: string;
  category?: string;
  activationLink: string;
  languages: string[];
  messageType: "initial" | "reminder" | "urgency" | "final_attempt" | "reactivation";
}

const TEMPLATES: Record<string, Record<string, (p: OutreachMessageParams) => string>> = {
  en: {
    initial: (p) =>
      `🎉 ${p.merchantName} — Your store in ${p.city} is ready to go live on Easy-Locs! Join free and start receiving orders today. ${p.activationLink}`,
    reminder: (p) =>
      `👋 Hi ${p.merchantName}! Your Easy-Locs store is waiting. Claim it now and start getting customers in ${p.city}. ${p.activationLink}`,
    urgency: (p) =>
      `⏰ ${p.merchantName}, customers in ${p.city} are looking for you! Activate your store before someone else does. ${p.activationLink}`,
    final_attempt: (p) =>
      `🔔 Last chance, ${p.merchantName}! Your Easy-Locs listing in ${p.city} will be archived soon. Claim it now: ${p.activationLink}`,
    reactivation: (p) =>
      `🚀 ${p.merchantName}, we miss you! Reactivate your store in ${p.city} and reach new customers today. ${p.activationLink}`,
  },
  ar: {
    initial: (p) =>
      `🎉 ${p.merchantName} — متجرك في ${p.city} جاهز للنشر على Easy-Locs! انضم مجاناً وابدأ في استقبال الطلبات اليوم. ${p.activationLink}`,
    reminder: (p) =>
      `👋 مرحباً ${p.merchantName}! متجرك على Easy-Locs في انتظارك. قم بالمطالبة به الآن. ${p.activationLink}`,
    urgency: (p) =>
      `⏰ ${p.merchantName}، العملاء في ${p.city} يبحثون عنك! فعّل متجرك الآن. ${p.activationLink}`,
    final_attempt: (p) =>
      `🔔 فرصة أخيرة، ${p.merchantName}! سيتم أرشفة قائمتك قريباً. طالب بها الآن: ${p.activationLink}`,
    reactivation: (p) =>
      `🚀 ${p.merchantName}، نفتقدك! أعد تفعيل متجرك في ${p.city} واستقبل عملاء جدد. ${p.activationLink}`,
  },
  fr: {
    initial: (p) =>
      `🎉 ${p.merchantName} — Votre boutique à ${p.city} est prête sur Easy-Locs ! Rejoignez gratuitement. ${p.activationLink}`,
    reminder: (p) =>
      `👋 Bonjour ${p.merchantName} ! Votre boutique Easy-Locs vous attend. Réclamez-la maintenant. ${p.activationLink}`,
    urgency: (p) =>
      `⏰ ${p.merchantName}, des clients à ${p.city} vous cherchent ! Activez votre boutique. ${p.activationLink}`,
    final_attempt: (p) =>
      `🔔 Dernière chance, ${p.merchantName} ! Votre fiche sera archivée bientôt. ${p.activationLink}`,
    reactivation: (p) =>
      `🚀 ${p.merchantName}, vous nous manquez ! Réactivez votre boutique à ${p.city}. ${p.activationLink}`,
  },
};

export function buildOutreachMessage(params: OutreachMessageParams): string[] {
  const messages: string[] = [];
  for (const lang of params.languages) {
    const tpl = TEMPLATES[lang]?.[params.messageType];
    if (tpl) messages.push(tpl(params));
  }
  if (messages.length === 0) {
    const fallback = TEMPLATES.en[params.messageType];
    if (fallback) messages.push(fallback(params));
  }
  return messages;
}
