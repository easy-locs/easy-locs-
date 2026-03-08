/**
 * Social sharing utilities for Easy-Locs.
 *
 * Generates share URLs that point to the social-preview edge function,
 * which serves proper og:meta tags for crawlers and redirects real browsers.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export type ShareableType = "listing" | "service" | "host" | "provider";

/**
 * Build a share URL that goes through the social-preview edge function.
 * Crawlers get HTML with correct og:image/og:title.
 * Real browsers get redirected to the SPA page.
 */
export function getSocialShareUrl(type: ShareableType, slug: string, version?: string | number): string {
  const params = new URLSearchParams({ type, slug });
  if (version) params.set("v", String(version));
  return `${SUPABASE_URL}/functions/v1/social-preview?${params.toString()}`;
}

/**
 * Share a page via Web Share API, clipboard fallback.
 */
export async function sharePage(opts: {
  type: ShareableType;
  slug: string;
  title: string;
  version?: string | number;
}): Promise<"shared" | "copied" | "failed"> {
  const url = getSocialShareUrl(opts.type, opts.slug, opts.version);

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
 */
export function getShareLinks(type: ShareableType, slug: string, title: string, version?: string | number) {
  const url = getSocialShareUrl(type, slug, version);
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return {
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encoded}`,
    telegram: `https://t.me/share/url?url=${encoded}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    twitter: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedTitle}%20${encoded}`,
    sms: `sms:?body=${encodedTitle}%20${encoded}`,
    copy: url,
  };
}
