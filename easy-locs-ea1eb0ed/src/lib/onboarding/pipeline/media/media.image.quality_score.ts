/**
 * media.image.quality_score — Scores image quality and classifies purpose.
 * ONE thing: score and classify images.
 */
import type { ImageQualityScore, NormalizedImage } from "../contracts";

const STOCK_PATTERNS = /shutterstock|istock|getty|unsplash|placeholder|dummy|lorem|picsum/i;
const LOGO_PATTERNS = /logo|brand|icon|favicon/i;

export function scoreImage(img: NormalizedImage, index: number): ImageQualityScore {
  const url = img.url.toLowerCase();
  const isStock = STOCK_PATTERNS.test(url);
  const isLogo = LOGO_PATTERNS.test(url) || index === 0;
  const isCover = index === 1 || (!isLogo && index <= 2);

  let score = 60;
  if (isStock) score -= 30;
  if (img.format === "svg") score -= 10; // SVGs are usually logos, not photos
  if (img.format === "webp" || img.format === "jpg" || img.format === "jpeg") score += 10;
  if (isLogo) score += 5;
  score = Math.max(0, Math.min(100, score));

  const reason = isStock ? "stock image detected" : isLogo ? "logo candidate" : isCover ? "cover candidate" : "gallery";
  return { url: img.url, score, isStock, isLogo, isCover, reason };
}

export function scoreImages(images: NormalizedImage[]): ImageQualityScore[] {
  return images.map((img, i) => scoreImage(img, i));
}
