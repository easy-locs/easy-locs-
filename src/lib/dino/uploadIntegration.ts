/**
 * DINO Upload Integration — Hooks media uploads into the normalization pipeline.
 */

import { supabase } from "@/integrations/supabase/client";
import { buildCloudinaryUrl } from "@/lib/media/cloudinaryUrl";
import { enqueueDinoJob } from "@/lib/dino/jobQueue";
import type { MediaProfileName } from "@/lib/dino/types";
import type { Json } from "@/integrations/supabase/types";

export async function registerUploadedAsset(input: {
  ownerType: string;
  ownerId: string;
  assetType: MediaProfileName;
  originalUrl: string;
}) {
  const normalizedUrl = buildCloudinaryUrl(input.originalUrl, input.assetType);

  const { data, error } = await supabase
    .from("media_assets")
    .insert([{
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      asset_type: input.assetType,
      original_url: input.originalUrl,
      normalized_url: normalizedUrl,
      profile_name: input.assetType,
      status: "normalized",
    }])
    .select()
    .single();

  if (error) throw error;

  // Enqueue media normalization job for verification
  await enqueueDinoJob({
    jobType: "normalize_media",
    entityType: input.ownerType as any,
    entityId: input.ownerId,
    payload: { assetType: input.assetType, mediaAssetId: data.id } as Record<string, unknown>,
    priority: 20,
  });

  return { mediaAssetId: data.id, normalizedUrl };
}

/**
 * Convenience wrappers for common upload types.
 */
export function registerRestaurantCover(restaurantId: string, url: string) {
  return registerUploadedAsset({ ownerType: "restaurant", ownerId: restaurantId, assetType: "restaurant_cover", originalUrl: url });
}

export function registerRestaurantLogo(restaurantId: string, url: string) {
  return registerUploadedAsset({ ownerType: "restaurant", ownerId: restaurantId, assetType: "restaurant_logo", originalUrl: url });
}

export function registerPropertyPhoto(propertyId: string, url: string) {
  return registerUploadedAsset({ ownerType: "property", ownerId: propertyId, assetType: "property_card", originalUrl: url });
}

export function registerAvatar(userId: string, url: string) {
  return registerUploadedAsset({ ownerType: "user", ownerId: userId, assetType: "avatar", originalUrl: url });
}
