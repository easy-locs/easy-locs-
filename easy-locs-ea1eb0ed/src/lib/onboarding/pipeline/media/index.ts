/**
 * Media Layer barrel.
 */
import type { MediaLayerOutput, NormalizedImage } from "../contracts";
import { normalizeImages } from "./media.image.normalize";
import { deduplicateImages } from "./media.image.deduplicate";
import { scoreImages } from "./media.image.quality_score";
import { selectCoverImages } from "./media.cover.select";
import { downloadAndHostImages, downloadAndHostSingleImage } from "./media.download.service";
import type { DownloadedImage } from "./media.download.service";

export { normalizeImages } from "./media.image.normalize";
export { deduplicateImages } from "./media.image.deduplicate";
export { scoreImages } from "./media.image.quality_score";
export { selectCoverImages } from "./media.cover.select";
export { downloadAndHostImages, downloadAndHostSingleImage } from "./media.download.service";

function applyDownloadResults(images: NormalizedImage[], downloaded: DownloadedImage[]): NormalizedImage[] {
  const downloadMap = new Map<string, DownloadedImage>();
  for (const d of downloaded) {
    downloadMap.set(d.originalUrl, d);
  }

  return images.map((img) => {
    const dl = downloadMap.get(img.url) ?? downloadMap.get(img.originalUrl);
    if (!dl) return img;
    return {
      ...img,
      hostedUrl: dl.failed ? null : dl.hostedUrl,
      thumbUrl: dl.thumbUrl,
      width: dl.width || img.width,
      height: dl.height || img.height,
      fileSize: dl.fileSize || img.fileSize,
      format: dl.format !== "unknown" ? dl.format : img.format,
      downloadFailed: dl.failed,
      downloadFailReason: dl.failReason,
    };
  });
}

export async function runMediaLayer(urls: string[], entityId?: string): Promise<MediaLayerOutput> {
  const normalized = normalizeImages(urls);
  const deduplicated = deduplicateImages(normalized);

  let enriched = deduplicated;
  if (entityId) {
    const urlsToDownload = deduplicated.map((img) => img.url);
    const downloaded = await downloadAndHostImages(urlsToDownload, entityId);
    enriched = applyDownloadResults(deduplicated, downloaded);
  }

  const scored = scoreImages(enriched);
  const selection = selectCoverImages(enriched, scored);

  const verifiedCount = enriched.filter((img) => {
    const enrichedImg = img as NormalizedImage & { hostedUrl?: string; downloadFailed?: boolean };
    return enrichedImg.hostedUrl && !enrichedImg.downloadFailed;
  }).length;

  return {
    normalized,
    deduplicated: enriched,
    scored,
    verifiedCount,
    ...selection,
  };
}

export function runMediaLayerSync(urls: string[]): MediaLayerOutput {
  const normalized = normalizeImages(urls);
  const deduplicated = deduplicateImages(normalized);
  const scored = scoreImages(deduplicated);
  const selection = selectCoverImages(deduplicated, scored);

  return {
    normalized,
    deduplicated,
    scored,
    verifiedCount: 0,
    ...selection,
  };
}
