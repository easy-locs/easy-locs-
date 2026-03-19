/**
 * DINO V5 — Media AI Pipeline
 * Auto-resize, crop, normalize quality, unify style across all media assets.
 */

export interface MediaProfile {
  assetType: string;
  width: number;
  height: number;
  crop: "fill" | "fit" | "pad";
  quality: "auto" | "high" | "low";
  format: "webp" | "jpg" | "png";
  aspectRatio: string;
}

export const MEDIA_PROFILES: Record<string, MediaProfile> = {
  restaurant_cover:       { assetType: "restaurant_cover",       width: 800, height: 450, crop: "fill", quality: "auto", format: "webp", aspectRatio: "16/9" },
  restaurant_logo:        { assetType: "restaurant_logo",        width: 200, height: 200, crop: "fill", quality: "auto", format: "webp", aspectRatio: "1/1" },
  product_card:           { assetType: "product_card",           width: 400, height: 400, crop: "fill", quality: "auto", format: "webp", aspectRatio: "1/1" },
  property_card:          { assetType: "property_card",          width: 600, height: 400, crop: "fill", quality: "auto", format: "webp", aspectRatio: "3/2" },
  travel_card:            { assetType: "travel_card",            width: 600, height: 400, crop: "fill", quality: "auto", format: "webp", aspectRatio: "3/2" },
  service_provider_card:  { assetType: "service_provider_card",  width: 400, height: 300, crop: "fill", quality: "auto", format: "webp", aspectRatio: "4/3" },
  avatar:                 { assetType: "avatar",                 width: 150, height: 150, crop: "fill", quality: "auto", format: "webp", aspectRatio: "1/1" },
  banner:                 { assetType: "banner",                 width: 1200, height: 400, crop: "fill", quality: "high", format: "webp", aspectRatio: "3/1" },
  shop_cover:             { assetType: "shop_cover",             width: 800, height: 400, crop: "fill", quality: "auto", format: "webp", aspectRatio: "2/1" },
};

export interface MediaNormalizationResult {
  originalUrl: string;
  normalizedUrl: string;
  profile: MediaProfile;
  applied: boolean;
  issues: string[];
}

export function normalizeMediaUrl(url: string, assetType: string): MediaNormalizationResult {
  const profile = MEDIA_PROFILES[assetType];
  const issues: string[] = [];

  if (!profile) {
    return { originalUrl: url, normalizedUrl: url, profile: MEDIA_PROFILES.product_card, applied: false, issues: ["Unknown asset type"] };
  }

  // Build normalized URL with transformation params
  const params = new URLSearchParams({
    w: String(profile.width),
    h: String(profile.height),
    fit: profile.crop,
    q: profile.quality === "high" ? "85" : profile.quality === "low" ? "60" : "75",
    fm: profile.format,
  });

  const separator = url.includes("?") ? "&" : "?";
  const normalizedUrl = `${url}${separator}${params.toString()}`;

  return { originalUrl: url, normalizedUrl, profile, applied: true, issues };
}

export interface MediaAuditResult {
  entityId: string;
  entityType: string;
  totalImages: number;
  normalized: number;
  issues: string[];
}

export function auditEntityMedia(entity: {
  id: string;
  type: string;
  imageUrls: string[];
  assetType: string;
}): MediaAuditResult {
  const issues: string[] = [];
  let normalized = 0;

  for (const url of entity.imageUrls) {
    if (!url || url.trim() === "") {
      issues.push("Empty image URL");
      continue;
    }
    const result = normalizeMediaUrl(url, entity.assetType);
    if (result.applied) normalized++;
    issues.push(...result.issues);
  }

  if (entity.imageUrls.length === 0) {
    issues.push("No images found");
  }

  return {
    entityId: entity.id,
    entityType: entity.type,
    totalImages: entity.imageUrls.length,
    normalized,
    issues,
  };
}
