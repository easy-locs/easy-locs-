/**
 * media.cover.select — Selects best logo, cover, and gallery images.
 * ONE thing: pick the best images for each purpose.
 */
import type { ImageQualityScore, MediaLayerOutput, NormalizedImage } from "../contracts";

export function selectCoverImages(
  deduplicated: NormalizedImage[],
  scored: ImageQualityScore[],
): Pick<MediaLayerOutput, "selectedCover" | "selectedLogo" | "gallery"> {
  const logos = scored.filter((s) => s.isLogo && !s.isStock).sort((a, b) => b.score - a.score);
  const covers = scored.filter((s) => s.isCover && !s.isStock).sort((a, b) => b.score - a.score);
  const galleryItems = scored.filter((s) => !s.isStock).sort((a, b) => b.score - a.score);

  return {
    selectedLogo: logos[0]?.url ?? deduplicated[0]?.url ?? null,
    selectedCover: covers[0]?.url ?? deduplicated[1]?.url ?? deduplicated[0]?.url ?? null,
    gallery: galleryItems.slice(0, 12).map((s) => s.url),
  };
}
