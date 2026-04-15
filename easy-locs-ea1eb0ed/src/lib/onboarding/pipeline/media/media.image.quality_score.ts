/**
 * media.image.quality_score — Scores image quality and classifies purpose.
 * ONE thing: score and classify images using real image data when available.
 */
import type { ImageQualityScore, NormalizedImage } from "../contracts";

const STOCK_PATTERNS = new RegExp(
  [
    "shutterstock", "istock", "getty", "unsplash", "placeholder", "dummy",
    "lorem", "picsum", "pexels", "freepik", "123rf", "adobestock",
    "stock\\.adobe", "pixabay", "rawpixel", "dreamstime", "depositphotos",
    "canva", "vecteezy", "stocksnap", "burst\\.shopify", "bigstock",
    "alamy", "stockfresh", "thinkstock", "fotolia",
  ].join("|"),
  "i",
);

const LOGO_URL_PATTERNS = /logo|brand|favicon/i;

function isLogoByDimensions(img: NormalizedImage): boolean {
  if (img.width == null || img.height == null) return false;
  if (img.width === 0 || img.height === 0) return false;
  const ratio = img.width / img.height;
  const isSquarish = ratio >= 0.7 && ratio <= 1.4;
  const isSmall = img.width <= 512 && img.height <= 512;
  return isSquarish && isSmall;
}

function isCoverByDimensions(img: NormalizedImage): boolean {
  if (img.width == null || img.height == null) return false;
  if (img.width === 0 || img.height === 0) return false;
  const ratio = img.width / img.height;
  return ratio >= 1.3 && img.width >= 600;
}

export function scoreImage(img: NormalizedImage, _index: number): ImageQualityScore {
  const url = img.url.toLowerCase();
  const isStock = STOCK_PATTERNS.test(url);

  const hasLogoDimensions = isLogoByDimensions(img);
  const hasLogoUrl = LOGO_URL_PATTERNS.test(url);
  const isLogo = hasLogoDimensions || (hasLogoUrl && !isCoverByDimensions(img));

  const isCover = !isLogo && isCoverByDimensions(img);

  let score = 50;

  if (isStock) score -= 30;

  if (img.width != null && img.height != null) {
    const pixels = img.width * img.height;
    if (pixels >= 1_000_000) score += 20;
    else if (pixels >= 500_000) score += 15;
    else if (pixels >= 250_000) score += 10;
    else if (pixels >= 100_000) score += 5;
    else score -= 5;
  }

  if (img.fileSize != null) {
    if (img.fileSize >= 50_000 && img.fileSize <= 5_000_000) score += 5;
    else if (img.fileSize < 5_000) score -= 10;
  }

  if (img.format === "svg") score -= 10;
  if (img.format === "webp" || img.format === "jpg" || img.format === "jpeg") score += 5;

  if (isLogo) score += 5;
  if (isCover) score += 10;

  if (img.downloadFailed) score -= 20;

  score = Math.max(0, Math.min(100, score));

  const reasons: string[] = [];
  if (isStock) reasons.push("stock image detected");
  if (isLogo) reasons.push("logo candidate");
  if (isCover) reasons.push("cover candidate");
  if (img.downloadFailed) reasons.push("download failed");
  if (reasons.length === 0) reasons.push("gallery");

  return { url: img.hostedUrl ?? img.url, score, isStock, isLogo, isCover, reason: reasons.join(", ") };
}

export function scoreImages(images: NormalizedImage[]): ImageQualityScore[] {
  return images.map((img, i) => scoreImage(img, i));
}
