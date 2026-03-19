/**
 * Upload Normalizer — Normalize uploaded image assets through media profiles.
 */

import { buildCloudinaryUrl } from "@/lib/media/cloudinaryUrl";
import type { MediaProfileName } from "@/lib/dino/types";

export function normalizeUploadedAsset(input: {
  publicId: string;
  assetType: MediaProfileName;
}) {
  return {
    originalUrl: input.publicId,
    normalizedUrl: buildCloudinaryUrl(input.publicId, input.assetType),
  };
}
