/**
 * Media Profiles — Standard image presets for the platform.
 */

import type { MediaProfile } from "@/lib/dino/types";

export const MEDIA_PROFILES: Record<string, MediaProfile> = {
  restaurant_cover: { name: "restaurant_cover", width: 1600, height: 900, crop: "fill", quality: "auto" },
  restaurant_logo: { name: "restaurant_logo", width: 512, height: 512, crop: "fit", quality: "auto" },
  product_card: { name: "product_card", width: 1200, height: 800, crop: "fill", quality: "auto" },
  property_card: { name: "property_card", width: 1400, height: 900, crop: "fill", quality: "auto" },
  travel_card: { name: "travel_card", width: 1400, height: 900, crop: "fill", quality: "auto" },
  service_provider_card: { name: "service_provider_card", width: 1000, height: 1000, crop: "fill", quality: "auto" },
  avatar: { name: "avatar", width: 512, height: 512, crop: "thumb", quality: "auto" },
  banner: { name: "banner", width: 1800, height: 600, crop: "fill", quality: "auto" },
  radar_preview: { name: "radar_preview", width: 800, height: 800, crop: "fill", quality: "auto" },
};

export function getMediaProfile(key: string): MediaProfile | undefined {
  return MEDIA_PROFILES[key];
}
