/**
 * Media Layer barrel.
 */
import type { MediaLayerOutput } from "../contracts";
import { normalizeImages } from "./media.image.normalize";
import { deduplicateImages } from "./media.image.deduplicate";
import { scoreImages } from "./media.image.quality_score";
import { selectCoverImages } from "./media.cover.select";

export { normalizeImages } from "./media.image.normalize";
export { deduplicateImages } from "./media.image.deduplicate";
export { scoreImages } from "./media.image.quality_score";
export { selectCoverImages } from "./media.cover.select";

export function runMediaLayer(urls: string[]): MediaLayerOutput {
  const normalized = normalizeImages(urls);
  const deduplicated = deduplicateImages(normalized);
  const scored = scoreImages(deduplicated);
  const selection = selectCoverImages(deduplicated, scored);

  return {
    normalized,
    deduplicated,
    scored,
    ...selection,
  };
}
