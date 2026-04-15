/**
 * media.cover.select — Selects best logo, cover, and gallery images.
 * ONE thing: pick the best images for each purpose.
 */
import type { ImageQualityScore, MediaLayerOutput, NormalizedImage } from "../contracts";

const GALLERY_CAP = 20;

export function selectCoverImages(
  deduplicated: NormalizedImage[],
  scored: ImageQualityScore[],
): Pick<MediaLayerOutput, "selectedCover" | "selectedLogo" | "gallery"> {
  const logos = scored.filter((s) => s.isLogo && !s.isStock).sort((a, b) => b.score - a.score);
  const covers = scored.filter((s) => s.isCover && !s.isStock).sort((a, b) => b.score - a.score);
  const galleryItems = scored.filter((s) => !s.isStock).sort((a, b) => b.score - a.score);

  const fallbackUrl = (img: NormalizedImage) => img.hostedUrl ?? img.url;

  return {
    selectedLogo: logos[0]?.url ?? (deduplicated[0] ? fallbackUrl(deduplicated[0]) : null),
    selectedCover: covers[0]?.url ?? (deduplicated[1] ? fallbackUrl(deduplicated[1]) : deduplicated[0] ? fallbackUrl(deduplicated[0]) : null),
    gallery: galleryItems.slice(0, GALLERY_CAP).map((s) => s.url),
  };
}
