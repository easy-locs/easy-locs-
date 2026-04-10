/**
 * Social sharing utilities for Easy-Locs.
 *
 * Two URL types:
 * 1. Clean SPA URL (easy-locs.com/book/slug) — for copy/display
 * 2. Edge function URL — for social platforms (serves og:meta for crawlers)
 */

import { APP_BASE_URL } from "@/lib/app-domain";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export type ShareableType = "listing" | "service" | "host" | "provider" | "real-estate";

const TYPE_PATH_MAP: Record<ShareableType, string> = {
  listing: "/listing/",
  service: "/book/",
  host: "/host/",
  provider: "/provider/",
  "real-estate": "/properties/",
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
 * Edge function URL for social platforms (WhatsApp, Telegram, etc.)
 * Crawlers get HTML with og:image/og:title, browsers get redirected.
 */
export function getSocialShareUrl(type: ShareableType, slug: string, version?: string | number): string {
  const params = new URLSearchParams({ type, slug });
  const normalized = normalizeVersion(version);
  if (normalized) params.set("v", normalized);
  return `${SUPABASE_URL}/functions/v1/social-preview?${params.toString()}`;
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
 * Social platforms use edge function URL for OG previews.
 * Copy uses clean SPA URL.
 */
export function getShareLinks(type: ShareableType, slug: string, title: string, version?: string | number) {
  const cleanUrl = getCleanShareUrl(type, slug);
  const encodedClean = encodeURIComponent(cleanUrl);
  const encodedTitle = encodeURIComponent(title);

  return {
    // Use clean URLs for all platforms — looks professional and trustworthy
    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedClean}`,
    telegram: `https://t.me/share/url?url=${encodedClean}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedClean}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedClean}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedClean}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedTitle}%20${encodedClean}`,
    sms: `sms:?body=${encodedTitle}%20${encodedClean}`,
    copy: cleanUrl,
  };
}
