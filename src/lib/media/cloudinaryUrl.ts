/**
 * Cloudinary URL Builder — Generates optimized image URLs.
 * No-op passthrough if cloud name is not configured.
 */

import { MEDIA_PROFILES } from "./mediaProfiles";

export function buildCloudinaryUrl(
  publicId: string,
  profileKey: keyof typeof MEDIA_PROFILES,
): string {
  const profile = MEDIA_PROFILES[profileKey];
  if (!profile) return publicId;

  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
  if (!cloud) return publicId;

  return `https://res.cloudinary.com/${cloud}/image/upload/c_${profile.crop},w_${profile.width},h_${profile.height},q_${typeof profile.quality === "number" ? profile.quality : "auto"},f_auto/${publicId}`;
}

/**
 * Normalize any image URL through Cloudinary with a given profile.
 * Returns original URL if Cloudinary is not configured.
 */
export function normalizeImageUrl(
  originalUrl: string,
  profileKey: keyof typeof MEDIA_PROFILES,
): { originalUrl: string; normalizedUrl: string } {
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
  if (!cloud) return { originalUrl, normalizedUrl: originalUrl };

  const profile = MEDIA_PROFILES[profileKey];
  if (!profile) return { originalUrl, normalizedUrl: originalUrl };

  // For already-Cloudinary URLs, transform in place
  if (originalUrl.includes("res.cloudinary.com")) {
    const parts = originalUrl.split("/upload/");
    if (parts.length === 2) {
      const normalizedUrl = `${parts[0]}/upload/c_${profile.crop},w_${profile.width},h_${profile.height},q_auto,f_auto/${parts[1].replace(/^[^/]+\//, "")}`;
      return { originalUrl, normalizedUrl };
    }
  }

  // For fetch-based transformation
  const normalizedUrl = `https://res.cloudinary.com/${cloud}/image/fetch/c_${profile.crop},w_${profile.width},h_${profile.height},q_auto,f_auto/${encodeURIComponent(originalUrl)}`;
  return { originalUrl, normalizedUrl };
}
