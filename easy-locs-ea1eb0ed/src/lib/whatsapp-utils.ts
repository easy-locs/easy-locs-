import type { ListingContext } from "@/lib/contact-utils";

export const WHATSAPP_BRAND_GREEN = "#25D366";
export const WHATSAPP_DARK_GREEN = "#128C7E";
export const WHATSAPP_LIGHT_GREEN = "#dcf8c6";

export function sanitizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  cleaned = cleaned.replace(/[^0-9]/g, "");
  return cleaned;
}

export function hasCountryCode(phone: string): boolean {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return true;
  if (trimmed.startsWith("00")) return true;
  const clean = sanitizePhone(phone);
  if (/^0[^0]/.test(clean)) return false;
  return clean.length >= 10;
}

export function isValidWhatsAppNumber(phone: string): boolean {
  const clean = sanitizePhone(phone);
  if (clean.length < 7 || clean.length > 15) return false;
  if (/^0[^0]/.test(clean)) return false;
  return hasCountryCode(phone);
}

export function triggerHaptic(style: "light" | "medium" = "light"): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(style === "medium" ? 25 : 10);
    }
  } catch {}
}

export function detectCountryCode(phone: string): string | null {
  const clean = sanitizePhone(phone);
  const codes: Record<string, string> = {
    "1": "US/CA", "33": "FR", "44": "UK", "971": "UAE",
    "212": "MA", "213": "DZ", "216": "TN", "20": "EG",
    "966": "SA", "974": "QA", "965": "KW", "973": "BH",
    "968": "OM", "962": "JO", "961": "LB", "964": "IQ",
    "90": "TR", "49": "DE", "34": "ES", "39": "IT",
    "32": "BE", "41": "CH", "31": "NL",
  };
  for (const [code, country] of Object.entries(codes)) {
    if (clean.startsWith(code)) return country;
  }
  return null;
}

type MessageLocale = "en" | "fr" | "ar";

function detectLocale(): MessageLocale {
  if (typeof navigator === "undefined") return "fr";
  const lang = navigator.language?.toLowerCase() || "";
  if (lang.startsWith("ar")) return "ar";
  if (lang.startsWith("en")) return "en";
  return "fr";
}

interface ListingInquiryParams {
  title: string;
  price?: string;
  city?: string;
  url?: string;
  locale?: MessageLocale;
}

export function buildListingInquiryMessage(params: ListingInquiryParams): string {
  const locale = params.locale || detectLocale();
  const url = params.url || (typeof window !== "undefined" ? window.location.href : "");

  const templates: Record<MessageLocale, () => string> = {
    en: () => {
      const parts = [`Hi, I'm interested in "${params.title}"`];
      if (params.price) parts[0] += ` (${params.price})`;
      if (params.city) parts[0] += ` in ${params.city}`;
      parts[0] += ".";
      parts.push("Is it still available?");
      if (url) parts.push(`\n${url}`);
      return parts.join("\n");
    },
    fr: () => {
      const parts = [`Bonjour, je suis intéressé(e) par "${params.title}"`];
      if (params.price) parts[0] += ` (${params.price})`;
      if (params.city) parts[0] += ` à ${params.city}`;
      parts[0] += ".";
      parts.push("Est-ce toujours disponible ?");
      if (url) parts.push(`\n${url}`);
      return parts.join("\n");
    },
    ar: () => {
      const parts = [`مرحباً، أنا مهتم بـ "${params.title}"`];
      if (params.price) parts[0] += ` (${params.price})`;
      if (params.city) parts[0] += ` في ${params.city}`;
      parts.push("هل لا يزال متاحاً؟");
      if (url) parts.push(`\n${url}`);
      return parts.join("\n");
    },
  };

  return templates[locale]();
}

interface BookingShareParams {
  serviceName: string;
  date?: string;
  time?: string;
  price?: string;
  currency?: string;
  reference?: string;
  clientName?: string;
  locale?: MessageLocale;
}

export function buildBookingShareMessage(params: BookingShareParams): string {
  const locale = params.locale || detectLocale();

  const templates: Record<MessageLocale, () => string> = {
    en: () => {
      const lines = [`✅ Booking Confirmation`];
      lines.push(`Service: ${params.serviceName}`);
      if (params.date) lines.push(`Date: ${params.date}${params.time ? ` at ${params.time}` : ""}`);
      if (params.price) lines.push(`Amount: ${params.price} ${params.currency || ""}`);
      if (params.reference) lines.push(`Ref: ${params.reference}`);
      if (params.clientName) lines.push(`Client: ${params.clientName}`);
      return lines.join("\n");
    },
    fr: () => {
      const lines = [`✅ Confirmation de réservation`];
      lines.push(`Service : ${params.serviceName}`);
      if (params.date) lines.push(`Date : ${params.date}${params.time ? ` à ${params.time}` : ""}`);
      if (params.price) lines.push(`Montant : ${params.price} ${params.currency || ""}`);
      if (params.reference) lines.push(`Réf : ${params.reference}`);
      if (params.clientName) lines.push(`Client : ${params.clientName}`);
      return lines.join("\n");
    },
    ar: () => {
      const lines = [`✅ تأكيد الحجز`];
      lines.push(`الخدمة: ${params.serviceName}`);
      if (params.date) lines.push(`التاريخ: ${params.date}${params.time ? ` في ${params.time}` : ""}`);
      if (params.price) lines.push(`المبلغ: ${params.price} ${params.currency || ""}`);
      if (params.reference) lines.push(`المرجع: ${params.reference}`);
      if (params.clientName) lines.push(`العميل: ${params.clientName}`);
      return lines.join("\n");
    },
  };

  return templates[locale]();
}

interface InvoiceShareParams {
  invoiceNumber: string;
  serviceName: string;
  amount: string;
  currency?: string;
  taxLabel?: string;
  taxRate?: number;
  clientName: string;
  companyName?: string;
  locale?: MessageLocale;
}

export function buildInvoiceShareMessage(params: InvoiceShareParams): string {
  const locale = params.locale || detectLocale();

  const templates: Record<MessageLocale, () => string> = {
    en: () => {
      const lines = [`📄 Invoice ${params.invoiceNumber}`];
      lines.push(`Service: ${params.serviceName}`);
      lines.push(`Amount: ${params.amount} ${params.currency || ""}`);
      if (params.taxRate && params.taxRate > 0) lines.push(`(incl. ${params.taxLabel || "VAT"} ${params.taxRate}%)`);
      lines.push(`Client: ${params.clientName}`);
      if (params.companyName) lines.push(`— ${params.companyName}`);
      return lines.join("\n");
    },
    fr: () => {
      const lines = [`📄 Facture ${params.invoiceNumber}`];
      lines.push(`Service : ${params.serviceName}`);
      lines.push(`Montant : ${params.amount} ${params.currency || ""}`);
      if (params.taxRate && params.taxRate > 0) lines.push(`(incl. ${params.taxLabel || "TVA"} ${params.taxRate}%)`);
      lines.push(`Client : ${params.clientName}`);
      if (params.companyName) lines.push(`— ${params.companyName}`);
      return lines.join("\n");
    },
    ar: () => {
      const lines = [`📄 فاتورة ${params.invoiceNumber}`];
      lines.push(`الخدمة: ${params.serviceName}`);
      lines.push(`المبلغ: ${params.amount} ${params.currency || ""}`);
      if (params.taxRate && params.taxRate > 0) lines.push(`(شامل ${params.taxLabel || "ضريبة"} ${params.taxRate}%)`);
      lines.push(`العميل: ${params.clientName}`);
      if (params.companyName) lines.push(`— ${params.companyName}`);
      return lines.join("\n");
    },
  };

  return templates[locale]();
}

export function buildShareMessage(title: string, url: string, description?: string, price?: string): string {
  const locale = detectLocale();
  const templates: Record<MessageLocale, () => string> = {
    en: () => {
      let msg = title;
      if (price) msg += ` — ${price}`;
      if (description) msg += `\n${description.slice(0, 120)}`;
      msg += `\n\n${url}`;
      return msg;
    },
    fr: () => {
      let msg = title;
      if (price) msg += ` — ${price}`;
      if (description) msg += `\n${description.slice(0, 120)}`;
      msg += `\n\n${url}`;
      return msg;
    },
    ar: () => {
      let msg = title;
      if (price) msg += ` — ${price}`;
      if (description) msg += `\n${description.slice(0, 120)}`;
      msg += `\n\n${url}`;
      return msg;
    },
  };
  return templates[locale]();
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const clean = sanitizePhone(phone);
  if (!clean) return "";
  if (!message) return `https://wa.me/${clean}`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppShareLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppShareLinkWithUrl(title: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${title}\n\n${url}`)}`;
}

export function whatsappLinkFromContext(phone: string, ctx: ListingContext): string {
  const clean = sanitizePhone(phone);
  if (!clean) return "";
  const message = buildListingInquiryMessage({
    title: ctx.title,
    price: ctx.price,
    city: ctx.city,
    url: ctx.url || (typeof window !== "undefined" ? window.location.href : ""),
  });
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
