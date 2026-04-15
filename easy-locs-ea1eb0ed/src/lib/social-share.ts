/**
 * Social sharing utilities for Easy-Locs.
 *
 * Two URL types:
 * 1. Clean SPA URL (easy-locs.com/book/slug) — for copy/display
 * 2. Branded share URL (easy-locs.com/share/type/slug) — for social platforms
 *    Proxied through Vercel to the Supabase Edge Function, so crawlers see
 *    og:meta and browsers get redirected — all under the branded domain.
 *
 * WhatsApp links use the unified wa.me format via whatsapp-utils.
 */

import { APP_BASE_URL } from "@/lib/app-domain";
import { buildShareMessage, buildWhatsAppShareLink } from "@/lib/whatsapp-utils";

export type ShareableType =
  | "listing" | "service" | "host" | "provider" | "real-estate"
  | "payment" | "profile" | "contact" | "shop" | "product"
  | "order" | "short-link"
  | "restaurant" | "quran" | "hadith" | "forex" | "annonce"
  | "analytics" | "location" | "deal" | "flight" | "ride";

export const SOCIAL_SHARE_TYPES: ReadonlySet<ShareableType> = new Set<ShareableType>([
  "shop", "product", "order", "service", "listing", "deal",
  "restaurant", "quran", "hadith", "forex", "annonce",
  "analytics", "location", "flight", "ride",
]);

export function isSocialShareEligible(type: ShareableType): boolean {
  return SOCIAL_SHARE_TYPES.has(type);
}

const TYPE_PATH_MAP: Record<ShareableType, string> = {
  listing: "/listing/",
  service: "/book/",
  host: "/host/",
  provider: "/provider/",
  "real-estate": "/properties/",
  payment: "/pay/link/",
  profile: "/u/",
  contact: "/add-contact?userId=",
  shop: "/s/",
  product: "/p/",
  order: "/my-orders?id=",
  "short-link": "/sl/",
  restaurant: "/food/restaurant/",
  quran: "/dashboard/islamic?tab=quran&surah=",
  hadith: "/dashboard/islamic?tab=hadith&id=",
  forex: "/wallet?tab=forex&pair=",
  annonce: "/annonces/",
  analytics: "/dashboard/properties?tab=analytics",
  location: "/share-location/",
  deal: "/deals/",
  flight: "/travel/flights?id=",
  ride: "/mobility?id=",
};

function normalizeVersion(version?: string | number): string | undefined {
  if (version === undefined || version === null || version === "") return undefined;
  if (typeof version === "number") return String(version);

  const parsed = Date.parse(version);
  if (!Number.isNaN(parsed)) return String(parsed);

  const cleaned = version.replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned || undefined;
}

/**
 * Clean, stable SPA URL for display and clipboard copy.
 * Example: https://www.easy-locs.com/book/my-service-slug
 */
export function getCleanShareUrl(type: ShareableType, slug: string): string {
  const path = TYPE_PATH_MAP[type] || "/book/";
  return `${APP_BASE_URL}${path}${slug}`;
}

/**
 * Branded share URL for social platforms (WhatsApp, Telegram, etc.)
 * Proxied via Vercel → Supabase Edge Function.
 * Crawlers get HTML with og:image/og:title, browsers get redirected.
 * Example: https://www.easy-locs.com/share/listing/my-slug
 */
export function getSocialShareUrl(type: ShareableType, slug: string, version?: string | number): string {
  const base = `${APP_BASE_URL}/share/${type}/${encodeURIComponent(slug)}`;
  const normalized = normalizeVersion(version);
  if (normalized) return `${base}?v=${encodeURIComponent(normalized)}`;
  return base;
}

/**
 * Share a page via Web Share API, clipboard fallback.
 * Uses clean URL for sharing.
 */
export function appendReferralCode(url: string, referralCode?: string): string {
  if (!referralCode) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}ref=${encodeURIComponent(referralCode)}`;
}

export async function sharePage(opts: {
  type: ShareableType;
  slug: string;
  title: string;
  version?: string | number;
  referralCode?: string;
}): Promise<"shared" | "copied" | "failed"> {
  const rawUrl = getCleanShareUrl(opts.type, opts.slug);
  const url = appendReferralCode(rawUrl, opts.referralCode);

  if (navigator.share) {
    try {
      await navigator.share({ title: opts.title, url });
      return "shared";
    } catch {}
  }

  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}

/**
 * Generate share links for specific platforms.
 * Social platforms use branded share URL for OG previews.
 * WhatsApp uses consistent wa.me format.
 * Email, SMS, and copy use clean SPA URL.
 */
export function getShareLinks(type: ShareableType, slug: string, title: string, version?: string | number, referralCode?: string) {
  const rawCleanUrl = getCleanShareUrl(type, slug);
  const cleanUrl = appendReferralCode(rawCleanUrl, referralCode);
  const rawSocialUrl = isSocialShareEligible(type)
    ? getSocialShareUrl(type, slug, version)
    : rawCleanUrl;
  const socialUrl = appendReferralCode(rawSocialUrl, referralCode);
  const encodedSocial = encodeURIComponent(socialUrl);
  const encodedClean = encodeURIComponent(cleanUrl);
  const encodedTitle = encodeURIComponent(title);

  return {
    whatsapp: buildWhatsAppShareLink(buildShareMessage(title, socialUrl)),
    telegram: `https://t.me/share/url?url=${encodedSocial}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedSocial}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedSocial}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedSocial}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedTitle}%20${encodedClean}`,
    sms: `sms:?body=${encodedTitle}%20${encodedClean}`,
    copy: cleanUrl,
  };
}
