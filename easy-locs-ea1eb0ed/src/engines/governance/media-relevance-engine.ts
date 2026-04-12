import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import {
  toViolationVertical,
  type CanonicalVertical,
  type CanonicalMediaEntity,
  type GovernanceViolation,
  type MediaValidationStatus,
} from "@/domains/shared/canonical-types";
import { validateTaxonomy } from "./taxonomy-governance-engine";
import { persistViolations } from "@/services/governance/violation-persistence";

const QUALITY_THRESHOLDS = {
  minWidth: 200,
  minHeight: 200,
  maxSizeBytes: 10 * 1024 * 1024,
  allowedFormats: ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"],
  minRelevanceScore: 30,
};

const STOCK_PATTERNS = /shutterstock|istock|unsplash|gettyimages|dreamstime|123rf|depositphotos/i;
const WATERMARK_PATTERNS = /draft|proof|sample|watermark|preview|comp|demo/i;

interface MediaValidationResult {
  status: MediaValidationStatus;
  relevanceScore: number;
  conflictReason: string | null;
  displayAllowed: boolean;
  violations: GovernanceViolation[];
}

const mediaViolations: GovernanceViolation[] = [];

export function validateMedia(
  media: Partial<CanonicalMediaEntity>,
  contextVertical?: CanonicalVertical,
  contextCategory?: string
): MediaValidationResult {
  const violations: GovernanceViolation[] = [];
  let score = 100;
  let conflictReason: string | null = null;

  if (!media.url) {
    return {
      status: "rejected",
      relevanceScore: 0,
      conflictReason: "Missing media URL",
      displayAllowed: false,
      violations: [createViolation("invalid_media", "critical", "No media URL provided", media)],
    };
  }

  if (media.mimeType && !QUALITY_THRESHOLDS.allowedFormats.includes(media.mimeType)) {
    score -= 50;
    conflictReason = `Unsupported format: ${media.mimeType}`;
    violations.push(
      createViolation("invalid_media", "error", conflictReason, media)
    );
  }

  if (media.sizeBytes && media.sizeBytes > QUALITY_THRESHOLDS.maxSizeBytes) {
    score -= 20;
    conflictReason = `File too large: ${(media.sizeBytes / 1024 / 1024).toFixed(1)}MB`;
    violations.push(
      createViolation("invalid_media", "warning", conflictReason, media)
    );
  }

  if (media.width && media.width < QUALITY_THRESHOLDS.minWidth) {
    score -= 30;
    conflictReason = `Image too small: ${media.width}px width`;
    violations.push(
      createViolation("invalid_media", "warning", conflictReason, media)
    );
  }

  if (media.height && media.height < QUALITY_THRESHOLDS.minHeight) {
    score -= 30;
    conflictReason = `Image too small: ${media.height}px height`;
    violations.push(
      createViolation("invalid_media", "warning", conflictReason, media)
    );
  }

  if (media.url && STOCK_PATTERNS.test(media.url)) {
    score -= 15;
    violations.push(
      createViolation("invalid_media", "warning", "Stock image detected", media)
    );
  }

  if (media.fileName && WATERMARK_PATTERNS.test(media.fileName)) {
    score -= 40;
    conflictReason = "Watermarked or draft media detected";
    violations.push(
      createViolation("invalid_media", "error", conflictReason, media)
    );
  }

  if (
    contextVertical &&
    media.vertical &&
    media.vertical !== contextVertical
  ) {
    score -= 60;
    conflictReason = `Cross-vertical media: "${media.vertical}" media in "${contextVertical}" context`;
    violations.push(
      createViolation(
        "cross_vertical_contamination",
        "critical",
        conflictReason,
        media
      )
    );
  }

  if (contextVertical && contextCategory) {
    const taxResult = validateTaxonomy(
      contextVertical,
      contextCategory,
      media.subcategory ?? null
    );
    if (!taxResult.valid) {
      score -= 20;
    }
  }

  score = Math.max(0, Math.min(100, score));

  const displayAllowed = score >= QUALITY_THRESHOLDS.minRelevanceScore && violations.every((v) => v.severity !== "critical");

  let status: MediaValidationStatus = "approved";
  if (!displayAllowed) {
    status = violations.some((v) => v.severity === "critical") ? "rejected" : "quarantined";
  } else if (violations.length > 0) {
    status = "quarantined";
  }

  mediaViolations.push(...violations);
  if (violations.length > 0) persistViolations(violations);

  return {
    status,
    relevanceScore: score,
    conflictReason,
    displayAllowed,
    violations,
  };
}

function createViolation(
  type: GovernanceViolation["type"],
  severity: GovernanceViolation["severity"],
  message: string,
  media: Partial<CanonicalMediaEntity>
): GovernanceViolation {
  return {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    severity,
    source: `media:${media.id ?? "unknown"}`,
    target: `validation`,
    message,
    ownerDomain: media.vertical ?? "platform",
    vertical: toViolationVertical(media.vertical),
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
    autoRemediated: false,
    metadata: {
      mediaId: media.id,
      url: media.url,
      mimeType: media.mimeType,
    },
    engine: "media-relevance",
    code: `MEDIA_${type === "cross_vertical_contamination" ? "CROSS_VERTICAL" : "INVALID"}`,
    dedupKey: `media:${media.id ?? "unknown"}:${type}`,
    entityType: "media",
    entityId: media.id ?? undefined,
    status: "new",
  };
}

export function getMediaViolations(): GovernanceViolation[] {
  return [...mediaViolations];
}

export class MediaRelevanceEngine extends BaseEngine {
  constructor() {
    super({
      id: "media-relevance",
      name: "Media Relevance Engine",
      category: "governance",
      intervalMs: 45_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const recent = mediaViolations.filter(
      (v) => Date.now() - new Date(v.detectedAt).getTime() < this.intervalMs
    );

    const criticals = recent.filter((v) => v.severity === "critical");

    return {
      level: criticals.length > 0 ? "act" : recent.length > 0 ? "detect" : "observe",
      findings: recent.length,
      actions: criticals.map((v) => `BLOCK_MEDIA: ${v.message}`),
      duration: 0,
    };
  }
}
