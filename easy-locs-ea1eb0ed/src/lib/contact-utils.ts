/**
 * Centralized contact link builders with smart prefilled messages.
 * All listing contact actions flow through here.
 * WhatsApp logic delegates to the unified whatsapp-utils module.
 */
import { buildListingInquiryMessage, sanitizePhone, buildWhatsAppLink } from "@/lib/whatsapp-utils";

export interface ListingContext {
  title: string;
  /** Full public URL or path to listing */
  url?: string;
  price?: string;
  city?: string;
  country?: string;
  imageUrl?: string;
}

function getListingUrl(ctx: ListingContext): string {
  return ctx.url || (typeof window !== "undefined" ? window.location.href : "");
}

/** WhatsApp deep link — opens directly with prefilled message */
export function whatsappLink(phone: string, ctx: ListingContext): string {
  const clean = sanitizePhone(phone);
  if (!clean) return "";
  const message = buildListingInquiryMessage({
    title: ctx.title,
    price: ctx.price,
    city: ctx.city,
    url: getListingUrl(ctx),
  });
  return buildWhatsAppLink(phone, message);
}

/** Telegram deep link — share via t.me/share/url for listing context */
export function telegramLink(username: string | undefined, ctx: ListingContext): string {
  if (username) {
    const stripped = username.replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "");
    if (stripped.length < 5) {
      return `https://t.me/share/url?url=${encodeURIComponent(getListingUrl(ctx))}&text=${encodeURIComponent(ctx.title)}`;
    }
    return `https://t.me/${stripped}`;
  }
  return `https://t.me/share/url?url=${encodeURIComponent(getListingUrl(ctx))}&text=${encodeURIComponent(ctx.title)}`;
}

/** In-app Orbit message link — navigates to Orbit to message the contact */
export function emailLink(_email: string, _ctx: ListingContext): string {
  return `/orbit`;
}

/** Phone call link */
export function phoneLink(phone: string): string {
  return `tel:${phone}`;
}

/** SMS with listing context */
export function smsLink(phone: string, ctx: ListingContext): string {
  const msg = `Hi, I'm interested in "${ctx.title}" - ${getListingUrl(ctx)}`;
  return `sms:${phone}?body=${encodeURIComponent(msg)}`;
}
