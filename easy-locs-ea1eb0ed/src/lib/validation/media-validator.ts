import type { MediaFamily, MediaValidationResult, MediaIssue, ImageMetadata } from "./types";
import { isMediaFamilyCompatible, classifyMediaFamily, getFamilyDomain, getDomainForVertical } from "./media-families";
import { isImageDomainSafe } from "./fallback-resolver";

const MIN_WIDTH = 200;
const MIN_HEIGHT = 200;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);
const STOCK_PATTERNS = /shutterstock|istock|getty|unsplash|placeholder|dummy|lorem|picsum|pexels\.com\/photo/i;
const WATERMARK_PATTERNS = /watermark|sample|preview|draft|demo/i;
const MIN_ASPECT_RATIO = 0.3;
const MAX_ASPECT_RATIO = 3.5;

const seenHashes = new Set<string>();

function simpleHash(url: string): string {
  const parts = url.split(/[?#]/)[0];
  return parts.toLowerCase().replace(/https?:\/\//, "").replace(/\/$/, "");
}

export function validateImage(
  meta: ImageMetadata,
  expectedFamily: MediaFamily,
  entityName?: string,
  vertical?: string,
): MediaValidationResult {
  const issues: MediaIssue[] = [];
  let qualityScore = 100;

  const format = meta.format?.toLowerCase() ?? extractFormat(meta.url);
  if (format && !ALLOWED_FORMATS.has(format)) {
    issues.push({ type: "format_invalid", severity: "critical", detail: `Format "${format}" not allowed. Use jpg/png/webp.` });
    qualityScore -= 40;
  }

  if (meta.width != null && meta.width < MIN_WIDTH) {
    issues.push({ type: "too_small", severity: "critical", detail: `Width ${meta.width}px below minimum ${MIN_WIDTH}px.` });
    qualityScore -= 30;
  }
  if (meta.height != null && meta.height < MIN_HEIGHT) {
    issues.push({ type: "too_small", severity: "critical", detail: `Height ${meta.height}px below minimum ${MIN_HEIGHT}px.` });
    qualityScore -= 30;
  }

  if (meta.width != null && meta.height != null && meta.height > 0) {
    const ratio = meta.width / meta.height;
    if (ratio < MIN_ASPECT_RATIO || ratio > MAX_ASPECT_RATIO) {
      issues.push({ type: "wrong_aspect", severity: "warning", detail: `Aspect ratio ${ratio.toFixed(2)} outside safe range [${MIN_ASPECT_RATIO}–${MAX_ASPECT_RATIO}].` });
      qualityScore -= 15;
    }
  }

  if (meta.sizeBytes != null && meta.sizeBytes > MAX_FILE_SIZE) {
    issues.push({ type: "low_quality", severity: "warning", detail: `File size ${(meta.sizeBytes / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.` });
    qualityScore -= 10;
  }

  if (!meta.url || meta.url.trim() === "") {
    issues.push({ type: "empty_image", severity: "critical", detail: "Image URL is empty." });
    qualityScore -= 50;
  }

  if (STOCK_PATTERNS.test(meta.url)) {
    issues.push({ type: "stock_image", severity: "warning", detail: "Stock image source detected." });
    qualityScore -= 20;
  }

  if (WATERMARK_PATTERNS.test(meta.url)) {
    issues.push({ type: "watermark", severity: "warning", detail: "Possible watermark detected in URL." });
    qualityScore -= 15;
  }

  const hash = simpleHash(meta.url);
  if (seenHashes.has(hash)) {
    issues.push({ type: "duplicate", severity: "warning", detail: "Duplicate image detected." });
    qualityScore -= 10;
  } else {
    seenHashes.add(hash);
  }

  let detectedFamily: MediaFamily | null = null;
  if (entityName && vertical) {
    detectedFamily = classifyMediaFamily(entityName, vertical);
  }

  const mismatch = detectedFamily != null && !isMediaFamilyCompatible(detectedFamily, expectedFamily);
  if (mismatch) {
    const detectedDomain = detectedFamily ? getFamilyDomain(detectedFamily) : "unknown";
    const expectedDomain = getFamilyDomain(expectedFamily);
    issues.push({
      type: "family_mismatch",
      severity: "critical",
      detail: `Image classified as ${detectedDomain} but entity expects ${expectedDomain}.`,
    });
    qualityScore -= 30;
  }

  if (vertical && meta.url) {
    const entityDomain = getDomainForVertical(vertical);
    if (!isImageDomainSafe(meta.url, entityDomain)) {
      issues.push({
        type: "family_mismatch",
        severity: "warning",
        detail: `Image URL contains hints from a different domain than "${entityDomain}".`,
      });
      qualityScore -= 15;
    }
  }

  qualityScore = Math.max(0, Math.min(100, qualityScore));

  const hasCritical = issues.some((i) => i.severity === "critical");

  return {
    valid: !hasCritical,
    imageUrl: meta.url,
    detectedFamily,
    expectedFamily,
    mismatch,
    qualityScore,
    issues,
    blockReason: hasCritical ? issues.find((i) => i.severity === "critical")!.detail : null,
  };
}

export function validateEntityImages(
  images: ImageMetadata[],
  expectedFamily: MediaFamily,
  entityName?: string,
  vertical?: string,
): MediaValidationResult[] {
  return images.map((img) => validateImage(img, expectedFamily, entityName, vertical));
}

export function getMediaValidationSummary(results: MediaValidationResult[]): {
  total: number;
  valid: number;
  blocked: number;
  mismatched: number;
  avgQuality: number;
} {
  const total = results.length;
  const valid = results.filter((r) => r.valid).length;
  const blocked = results.filter((r) => !r.valid).length;
  const mismatched = results.filter((r) => r.mismatch).length;
  const avgQuality = total > 0 ? Math.round(results.reduce((sum, r) => sum + r.qualityScore, 0) / total) : 0;
  return { total, valid, blocked, mismatched, avgQuality };
}

export function resetDuplicateTracker() {
  seenHashes.clear();
}

function extractFormat(url: string): string {
  const clean = url.split(/[?#]/)[0];
  const ext = clean.split(".").pop()?.toLowerCase() ?? "";
  return ext;
}
