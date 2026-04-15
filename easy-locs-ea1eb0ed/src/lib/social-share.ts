/**
 * Social sharing utilities for Easy-Locs.
 *
 * Two URL types:
 * 1. Clean SPA URL (easy-locs.com/book/slug) — for copy/display
 * 2. Branded share URL (easy-locs.com/share/type/slug) — for social platforms
 *    Proxied through Vercel to the Supabase Edge Function, so crawlers see
 *    og:meta and browsers get redirected — all under the branded domain.
 */

import { APP_BASE_URL } from "@/lib/app-domain";

export type ShareableType = "listing" | "service" | "host" | "provider" | "real-estate" | "payment" | "profile" | "contact" | "shop" | "product" | "order" | "short-link";

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
export async function sharePage(opts: {
  type: ShareableType;
  slug: string;
  title: string;
  version?: string | number;
}): Promise<"shared" | "copied" | "failed"> {
  const url = getCleanShareUrl(opts.type, opts.slug);

  if (navigator.share) {
    try {
      await navigator.share({ title: opts.title, url });
      return "shared";
    } catch {
      // User cancelled or error
    }
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
 * Email, SMS, and copy use clean SPA URL.
 */
export function getShareLinks(type: ShareableType, slug: string, title: string, version?: string | number) {
  const cleanUrl = getCleanShareUrl(type, slug);
  const socialUrl = getSocialShareUrl(type, slug, version);
  const encodedSocial = encodeURIComponent(socialUrl);
  const encodedClean = encodeURIComponent(cleanUrl);
  const encodedTitle = encodeURIComponent(title);

  return {
    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedSocial}`,
    telegram: `https://t.me/share/url?url=${encodedSocial}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedSocial}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedSocial}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedSocial}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedTitle}%20${encodedClean}`,
    sms: `sms:?body=${encodedTitle}%20${encodedClean}`,
    copy: cleanUrl,
  };
}
