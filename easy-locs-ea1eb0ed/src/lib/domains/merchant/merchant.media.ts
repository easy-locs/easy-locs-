/**
 * merchant.media — Media assets for merchant profiles.
 */

export interface MerchantMedia {
  logoUrl?: string;
  coverUrl?: string;
  galleryUrls: string[];
  videoUrl?: string;
}

export function buildMediaScore(media: MerchantMedia): number {
  let score = 0;
  if (media.logoUrl) score += 30;
  if (media.coverUrl) score += 30;
  score += Math.min(30, media.galleryUrls.length * 10);
  if (media.videoUrl) score += 10;
  return Math.min(100, score);
}

export function hasMinimumMedia(media: MerchantMedia): boolean {
  return !!(media.logoUrl || media.coverUrl);
}
