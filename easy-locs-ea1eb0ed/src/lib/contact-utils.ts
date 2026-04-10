/**
 * Centralized contact link builders with smart prefilled messages.
 * All listing contact actions flow through here.
 */
import { buildAppUrl } from "@/lib/app-domain";

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

function smartMessage(ctx: ListingContext): string {
  const parts = [
    `Hi, I'm interested in "${ctx.title}"`,
    ctx.price ? `(${ctx.price})` : "",
    ctx.city ? `in ${ctx.city}` : "",
  ].filter(Boolean);
  return parts.join(" ") + `\n\n${getListingUrl(ctx)}`;
}

/** WhatsApp deep link — opens directly with prefilled message */
export function whatsappLink(phone: string, ctx: ListingContext): string {
  const clean = phone.replace(/[^0-9]/g, "");
  if (!clean) return "";
  return `https://wa.me/${clean}?text=${encodeURIComponent(smartMessage(ctx))}`;
}

/** Telegram deep link — share via t.me/share/url for listing context */
export function telegramLink(username: string | undefined, ctx: ListingContext): string {
  // If it's a username, open DM with that user
  if (username) {
    const clean = username.startsWith("http") ? username : `https://t.me/${username.replace(/^@/, "")}`;
    // For DM with context, we use the start parameter approach, but simpler is just the link
    return clean;
  }
  // Fallback: share URL via Telegram
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
