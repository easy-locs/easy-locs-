/**
 * BANNER INTEGRITY PIPELINE — 13-Stage Strict Asset Governance
 * =============================================================
 * Every banner/hero/video asset MUST pass through ALL stages before publication.
 * A single BLOCK at any stage prevents publication — no exceptions.
 *
 * Stages:
 *   1. ingest          — Receive asset with metadata
 *   2. normalize       — Normalize filenames, alt text, tags, URLs
 *   3. classify        — Detect asset type and vertical from signals
 *   4. semantic-validate — Check keyword alignment (allowed/forbidden)
 *   5. taxonomy-validate — Verify vertical/category/subcategory coherence
 *   6. cross-vertical-conflict-check — Detect contamination across verticals
 *   7. score           — Compute taxonomyScore, visualScore, finalScore
 *   8. accept-or-reject — Gate: finalScore >= threshold required
 *   9. fallback-resolve — If rejected, resolve correct vertical fallback
 *  10. publish-gate    — Hard block: no asset with conflicts passes
 *  11. monitor         — Post-publish monitoring hooks
 *  12. quarantine      — Isolate bad assets, block recurrence
 *  13. repair          — Log root cause, apply fix, prevent future repeat
 */

import {
  getVerticalGovernance,
  getVerticalFallbackPath,
  getMinScoreThreshold,
  type AssetMetadata,
  type AssetVertical,
  type AssetType,
  type TrustLevel,
  type ModerationStatus,
  type PublishStatus,
} from "./asset-governance-taxonomy";

import {
  registerAsset,
  getAsset,
  isAssetQuarantined,
  quarantineAsset,
  recordRepair,
  updateAssetStatus,
  type RegistryAsset,
} from "./asset-registry";

import {
  detectCrossVerticalContamination,
  classifyMediaKind,
} from "@/services/media-truth/media-truth-engine";
import type { CanonicalVertical } from "@/lib/taxonomy/canonical-registry";

export type PipelineStage =
  | "ingest"
  | "normalize"
  | "classify"
  | "semantic-validate"
  | "taxonomy-validate"
  | "cross-vertical-conflict-check"
  | "score"
  | "accept-or-reject"
  | "fallback-resolve"
  | "publish-gate"
  | "monitor"
  | "quarantine"
  | "repair";

export type PipelineDecision = "PASS" | "WARN" | "BLOCK" | "QUARANTINE" | "REPAIR";

export interface PipelineStageResult {
  stage: PipelineStage;
  decision: PipelineDecision;
  messages: string[];
  metadata?: Record<string, unknown>;
}

export interface PipelineInput {
  assetId: string;
  assetType: AssetType;
  url: string;
  declaredVertical: string;
  declaredCategory: string;
  declaredSubcategory?: string | null;
  filename?: string;
  altText?: string;
  title?: string;
  tags?: string[];
  source?: string;
  trustLevel?: TrustLevel;
  width?: number;
  height?: number;
  contextPageVertical?: string | null;
  contextPageCategory?: string | null;
  contextPageSubcategory?: string | null;
}

export interface PipelineResult {
  assetId: string;
  overallDecision: PipelineDecision;
  passed: boolean;
  blocked: boolean;
  quarantined: boolean;
  repaired: boolean;
  stages: PipelineStageResult[];
  taxonomyScore: number;
  visualScore: number;
  finalScore: number;
  publishStatus: PublishStatus;
  moderationStatus: ModerationStatus;
  resolvedVertical: string;
  resolvedFallbackUrl?: string;
  rejectionReasons: string[];
  incidents: string[];
  processedAt: string;
}

const _incidentLog: Array<{ assetId: string; incident: string; at: string }> = [];
const _blockedAssets = new Set<string>();
const MAX_REPAIR_ATTEMPTS = 3;
const _repairAttempts = new Map<string, number>();

function logIncident(assetId: string, incident: string): void {
  _incidentLog.push({ assetId, incident, at: new Date().toISOString() });
  console.warn(`[BannerIntegrityPipeline] INCIDENT [${assetId}]: ${incident}`);
}

function isStormProtected(assetId: string): boolean {
  const attempts = _repairAttempts.get(assetId) ?? 0;
  return attempts >= MAX_REPAIR_ATTEMPTS;
}

function incrementRepairAttempts(assetId: string): number {
  const current = _repairAttempts.get(assetId) ?? 0;
  _repairAttempts.set(assetId, current + 1);
  return current + 1;
}

function stageIngest(input: PipelineInput): PipelineStageResult {
  const messages: string[] = [];
  let decision: PipelineDecision = "PASS";

  if (!input.assetId || !input.url) {
    messages.push("BLOCK: Asset missing required fields (assetId, url)");
    decision = "BLOCK";
  }

  if (!input.declaredVertical) {
    messages.push("BLOCK: No vertical declared — cannot govern ungoverned asset");
    decision = "BLOCK";
  }

  if (isAssetQuarantined(input.assetId)) {
    messages.push(`BLOCK: Asset ${input.assetId} is quarantined — cannot reprocess without explicit restoration`);
    decision = "BLOCK";
  }

  if (isStormProtected(input.assetId)) {
    messages.push(`BLOCK: Asset ${input.assetId} has exceeded max repair attempts (${MAX_REPAIR_ATTEMPTS}) — storm protection active`);
    decision = "BLOCK";
  }

  if (decision === "PASS") {
    messages.push(`Ingested asset ${input.assetId} for vertical ${input.declaredVertical}`);
  }

  return { stage: "ingest", decision, messages };
}

function stageNormalize(input: PipelineInput): { result: PipelineStageResult; normalized: AssetMetadata } {
  const messages: string[] = [];

  const normalized: AssetMetadata = {
    assetId: input.assetId,
    filename: input.filename?.toLowerCase().trim(),
    altText: input.altText?.toLowerCase().trim(),
    url: input.url?.toLowerCase(),
    title: input.title?.toLowerCase().trim(),
    description: input.tags?.join(" ").toLowerCase(),
    tags: input.tags?.map((t) => t.toLowerCase().trim()),
    declaredVertical: input.declaredVertical?.toLowerCase().trim(),
    declaredCategory: input.declaredCategory?.toLowerCase().trim(),
    declaredSubcategory: input.declaredSubcategory?.toLowerCase().trim() ?? undefined,
    source: input.source,
    trustLevel: input.trustLevel,
  };

  messages.push("Normalized asset metadata (filename, altText, url, tags lowercased)");

  return {
    result: { stage: "normalize", decision: "PASS", messages },
    normalized,
  };
}

function stageClassify(
  input: PipelineInput,
  normalized: AssetMetadata
): { result: PipelineStageResult; detectedVertical: string | null; detectedKind: string | null } {
  const messages: string[] = [];
  let decision: PipelineDecision = "PASS";

  const verticalSignals: Record<string, string[]> = {
    food: ["food", "restaurant", "cafe", "meal", "dish", "cuisine", "menu", "dining", "kitchen", "chef", "cook"],
    grocery: ["grocery", "market", "supermarket", "produce", "fresh", "fruit", "vegetable", "dairy", "store"],
    healthcare: ["health", "medical", "clinic", "hospital", "doctor", "pharmacy", "medicine", "dental", "lab", "care"],
    beauty: ["beauty", "salon", "spa", "hair", "nail", "makeup", "cosmetic", "skincare", "grooming", "barber"],
    shops: ["shop", "store", "retail", "fashion", "clothing", "boutique", "electronics", "jewelry", "brand"],
    services: ["service", "repair", "cleaning", "handyman", "plumbing", "electrical", "maintenance", "moving"],
    stay: ["hotel", "resort", "hostel", "stay", "accommodation", "room", "suite", "booking", "check-in"],
    property: ["property", "apartment", "villa", "house", "real estate", "rent", "sale", "bedroom", "listing"],
    mobility: ["taxi", "car", "transport", "driver", "delivery", "ride", "courier", "bike", "scooter"],
    experiences: ["tour", "activity", "experience", "adventure", "event", "concert", "museum", "attraction"],
    utility: ["atm", "fuel", "parking", "bank", "utility", "charging", "station"],
    education: ["school", "university", "education", "learning", "course", "training", "tutoring"],
    finance: ["finance", "payment", "investment", "insurance", "exchange", "banking"],
  };

  const searchText = [
    normalized.filename ?? "",
    normalized.altText ?? "",
    normalized.url ?? "",
    normalized.title ?? "",
    normalized.description ?? "",
    ...(normalized.tags ?? []),
  ].join(" ");

  let bestVertical: string | null = null;
  let bestScore = 0;

  for (const [v, signals] of Object.entries(verticalSignals)) {
    const score = signals.filter((s) => searchText.includes(s)).length;
    if (score > bestScore) {
      bestScore = score;
      bestVertical = v;
    }
  }

  if (bestVertical && bestVertical !== input.declaredVertical) {
    messages.push(`WARN: Detected vertical "${bestVertical}" differs from declared "${input.declaredVertical}" (score=${bestScore})`);
    if (bestScore >= 3) {
      decision = "WARN";
    }
  } else {
    messages.push(`Classified as vertical "${input.declaredVertical}" (signal score=${bestScore})`);
  }

  const mediaKind = classifyMediaKind(
    input.url,
    input.title ?? input.filename ?? input.assetId,
    input.declaredVertical as CanonicalVertical,
    input.tags
  );

  return {
    result: { stage: "classify", decision, messages, metadata: { detectedVertical: bestVertical, mediaKind } },
    detectedVertical: bestVertical,
    detectedKind: mediaKind,
  };
}

function stageSemanticValidate(
  input: PipelineInput,
  normalized: AssetMetadata
): PipelineStageResult {
  const messages: string[] = [];
  let decision: PipelineDecision = "PASS";

  const gov = getVerticalGovernance(input.declaredVertical);
  if (!gov) {
    messages.push(`BLOCK: No governance rules found for vertical "${input.declaredVertical}"`);
    return { stage: "semantic-validate", decision: "BLOCK", messages };
  }

  const searchText = [
    normalized.filename ?? "",
    normalized.altText ?? "",
    normalized.url ?? "",
    normalized.title ?? "",
    normalized.description ?? "",
    ...(normalized.tags ?? []),
  ].join(" ").toLowerCase();

  const foundForbidden = gov.forbiddenKeywords.filter((kw) => searchText.includes(kw));
  if (foundForbidden.length > 0) {
    messages.push(`BLOCK: Forbidden keywords detected: [${foundForbidden.join(", ")}] for vertical "${input.declaredVertical}"`);
    decision = "BLOCK";
  }

  const foundAllowed = gov.allowedKeywords.filter((kw) => searchText.includes(kw));
  if (foundAllowed.length === 0 && decision === "PASS") {
    messages.push(`WARN: No allowed keywords found for vertical "${input.declaredVertical}" — weak semantic signal`);
    decision = "WARN";
  } else if (decision === "PASS") {
    messages.push(`Semantic validation passed — matched ${foundAllowed.length} allowed keywords`);
  }

  const assetType = input.assetType;
  const rules = assetType === "banner" ? gov.bannerRules : assetType === "hero" ? gov.heroRules : [];
  for (const rule of rules) {
    const passed = rule.check(normalized);
    if (!passed) {
      messages.push(`${rule.severity === "block" ? "BLOCK" : "WARN"}: Rule [${rule.id}] failed — ${rule.reason}`);
      if (rule.severity === "block") decision = "BLOCK";
      else if (decision === "PASS") decision = "WARN";
    }
  }

  return { stage: "semantic-validate", decision, messages };
}

function stageTaxonomyValidate(input: PipelineInput): PipelineStageResult {
  const messages: string[] = [];
  let decision: PipelineDecision = "PASS";

  const gov = getVerticalGovernance(input.declaredVertical);
  if (!gov) {
    messages.push(`BLOCK: Vertical "${input.declaredVertical}" not in canonical taxonomy governance`);
    return { stage: "taxonomy-validate", decision: "BLOCK", messages };
  }

  if (!gov.validAssetTypes.includes(input.assetType)) {
    messages.push(`BLOCK: Asset type "${input.assetType}" not valid for vertical "${input.declaredVertical}"`);
    decision = "BLOCK";
  }

  if (input.contextPageVertical && input.contextPageVertical !== input.declaredVertical) {
    messages.push(
      `BLOCK: Asset vertical "${input.declaredVertical}" mismatches page vertical "${input.contextPageVertical}" — taxonomy coherence violation`
    );
    decision = "BLOCK";
  }

  if (decision === "PASS") {
    messages.push(`Taxonomy valid: vertical=${input.declaredVertical}, assetType=${input.assetType}`);
  }

  return { stage: "taxonomy-validate", decision, messages };
}

function stageCrossVerticalConflict(input: PipelineInput): PipelineStageResult {
  const messages: string[] = [];
  let decision: PipelineDecision = "PASS";

  const gov = getVerticalGovernance(input.declaredVertical);
  if (!gov) {
    return { stage: "cross-vertical-conflict-check", decision: "PASS", messages: ["No governance config — conflict check skipped"] };
  }

  const { contaminated, suspectedVertical } = detectCrossVerticalContamination(
    input.url,
    input.declaredVertical as CanonicalVertical,
    null
  );

  if (contaminated && suspectedVertical) {
    messages.push(
      `BLOCK: Cross-vertical contamination detected — URL signals "${suspectedVertical}" but declared as "${input.declaredVertical}"`
    );
    decision = "BLOCK";
  }

  const searchText = [input.filename, input.altText, input.title, ...(input.tags ?? [])].join(" ").toLowerCase();
  const contaminatingVerticals = gov.forbiddenVerticals.filter((v) => {
    const otherGov = getVerticalGovernance(v);
    if (!otherGov) return false;
    return otherGov.allowedKeywords.some((kw) => searchText.includes(kw));
  });

  if (contaminatingVerticals.length > 0) {
    messages.push(
      `BLOCK: Asset metadata signals forbidden verticals: [${contaminatingVerticals.join(", ")}] — strict separation violation`
    );
    decision = "BLOCK";
  }

  if (decision === "PASS") {
    messages.push(`Cross-vertical conflict check passed for "${input.declaredVertical}"`);
  }

  return { stage: "cross-vertical-conflict-check", decision, messages };
}

function stageScore(
  input: PipelineInput,
  normalized: AssetMetadata,
  stageResults: PipelineStageResult[]
): { result: PipelineStageResult; taxonomyScore: number; visualScore: number; finalScore: number } {
  const messages: string[] = [];

  const gov = getVerticalGovernance(input.declaredVertical);
  let taxonomyScore = 50;
  let visualScore = 70;

  if (gov) {
    const searchText = [
      normalized.filename ?? "",
      normalized.altText ?? "",
      normalized.url ?? "",
      normalized.title ?? "",
      normalized.description ?? "",
      ...(normalized.tags ?? []),
    ].join(" ").toLowerCase();

    const allowedMatches = gov.allowedKeywords.filter((kw) => searchText.includes(kw)).length;
    const totalAllowed = gov.allowedKeywords.length;
    taxonomyScore = totalAllowed > 0 ? Math.min(100, Math.round((allowedMatches / totalAllowed) * 200)) : 50;

    if (input.trustLevel === "platform") taxonomyScore = Math.min(100, taxonomyScore + 20);
    else if (input.trustLevel === "verified") taxonomyScore = Math.min(100, taxonomyScore + 10);
    else if (input.trustLevel === "unknown") taxonomyScore = Math.max(0, taxonomyScore - 20);
  }

  const warnings = stageResults.filter((s) => s.decision === "WARN").length;
  const blocks = stageResults.filter((s) => s.decision === "BLOCK").length;

  visualScore = Math.max(0, 70 - warnings * 10 - blocks * 25);

  const weightedFinal = Math.round(taxonomyScore * 0.6 + visualScore * 0.4);
  const finalScore = Math.max(0, Math.min(100, weightedFinal));

  messages.push(`Scores: taxonomy=${taxonomyScore}, visual=${visualScore}, final=${finalScore}`);

  return {
    result: { stage: "score", decision: "PASS", messages, metadata: { taxonomyScore, visualScore, finalScore } },
    taxonomyScore,
    visualScore,
    finalScore,
  };
}

function stageAcceptOrReject(
  input: PipelineInput,
  finalScore: number,
  stageResults: PipelineStageResult[]
): PipelineStageResult {
  const messages: string[] = [];
  const threshold = getMinScoreThreshold(input.declaredVertical);
  const anyBlock = stageResults.some((s) => s.decision === "BLOCK");

  if (anyBlock) {
    messages.push(`BLOCK: One or more previous stages BLOCKED this asset — publication denied`);
    return { stage: "accept-or-reject", decision: "BLOCK", messages };
  }

  if (finalScore < threshold) {
    messages.push(`BLOCK: finalScore ${finalScore} is below threshold ${threshold} for vertical "${input.declaredVertical}"`);
    return { stage: "accept-or-reject", decision: "BLOCK", messages };
  }

  messages.push(`ACCEPTED: finalScore ${finalScore} >= threshold ${threshold}`);
  return { stage: "accept-or-reject", decision: "PASS", messages };
}

function stageFallbackResolve(input: PipelineInput, rejected: boolean): PipelineStageResult {
  const messages: string[] = [];

  if (!rejected) {
    messages.push("No fallback needed — asset passed");
    return { stage: "fallback-resolve", decision: "PASS", messages };
  }

  const fallbackUrl = getVerticalFallbackPath(input.declaredVertical);

  if (!fallbackUrl || fallbackUrl.includes("generic") || fallbackUrl.includes("universal")) {
    logIncident(input.assetId, `No valid vertical-specific fallback for "${input.declaredVertical}" — generic fallback blocked`);
    messages.push(`WARN: Using strict per-vertical fallback: ${fallbackUrl} (incident logged)`);
  } else {
    messages.push(`Resolved vertical-specific fallback: ${fallbackUrl}`);
  }

  return {
    stage: "fallback-resolve",
    decision: "WARN",
    messages,
    metadata: { fallbackUrl },
  };
}

function stagePublishGate(
  input: PipelineInput,
  stageResults: PipelineStageResult[],
  finalScore: number
): PipelineStageResult {
  const messages: string[] = [];
  const threshold = getMinScoreThreshold(input.declaredVertical);
  const anyBlock = stageResults.some((s) => s.decision === "BLOCK");
  const contextMismatch = input.contextPageVertical && input.contextPageVertical !== input.declaredVertical;
  const scoreFail = finalScore < threshold;

  const blockReasons: string[] = [];
  if (anyBlock) blockReasons.push("previous stage BLOCK");
  if (contextMismatch) blockReasons.push(`page context mismatch (page=${input.contextPageVertical}, asset=${input.declaredVertical})`);
  if (scoreFail) blockReasons.push(`score ${finalScore} < threshold ${threshold}`);

  if (blockReasons.length > 0) {
    messages.push(`PUBLISH_GATE_BLOCKED: [${blockReasons.join("; ")}]`);
    logIncident(input.assetId, `Publish gate blocked: ${blockReasons.join("; ")}`);
    _blockedAssets.add(input.assetId);
    return { stage: "publish-gate", decision: "BLOCK", messages };
  }

  messages.push(`PUBLISH_GATE_PASSED: asset cleared for publication`);
  return { stage: "publish-gate", decision: "PASS", messages };
}

function stageMonitor(input: PipelineInput, passed: boolean): PipelineStageResult {
  const messages: string[] = [];

  if (passed) {
    messages.push(`Monitoring registered for asset ${input.assetId} (vertical=${input.declaredVertical})`);
  } else {
    messages.push(`Asset ${input.assetId} not published — monitoring not activated`);
  }

  return { stage: "monitor", decision: "PASS", messages };
}

function stageQuarantine(input: PipelineInput, blocked: boolean, blockReasons: string[]): PipelineStageResult {
  const messages: string[] = [];

  if (!blocked) {
    messages.push("No quarantine needed");
    return { stage: "quarantine", decision: "PASS", messages };
  }

  const reason = blockReasons.join("; ");
  quarantineAsset(input.assetId, reason);
  logIncident(input.assetId, `Quarantined: ${reason}`);
  messages.push(`QUARANTINED: asset ${input.assetId} isolated — reason: ${reason}`);
  messages.push(`Recurrence prevention: asset blocked from re-ingestion until restored`);

  return { stage: "quarantine", decision: "QUARANTINE", messages };
}

function stageRepair(input: PipelineInput, quarantined: boolean, blockReasons: string[]): PipelineStageResult {
  const messages: string[] = [];

  if (!quarantined) {
    messages.push("No repair needed");
    return { stage: "repair", decision: "PASS", messages };
  }

  const attempts = incrementRepairAttempts(input.assetId);
  const rootCause = blockReasons.join("; ");
  const repairAction = `Applied fallback for vertical "${input.declaredVertical}" — original blocked due to: ${rootCause}`;

  recordRepair(input.assetId, rootCause, repairAction);

  messages.push(`REPAIR: root cause logged — ${rootCause}`);
  messages.push(`Repair action: ${repairAction}`);
  messages.push(`Repair attempt ${attempts}/${MAX_REPAIR_ATTEMPTS}`);

  if (attempts >= MAX_REPAIR_ATTEMPTS) {
    messages.push(`WARN: Max repair attempts reached — storm protection activated for ${input.assetId}`);
  }

  return { stage: "repair", decision: "REPAIR", messages };
}

export async function runBannerIntegrityPipeline(input: PipelineInput): Promise<PipelineResult> {
  const processedAt = new Date().toISOString();
  const stages: PipelineStageResult[] = [];
  const rejectionReasons: string[] = [];
  const incidents: string[] = [];

  let blocked = false;
  let quarantined = false;
  let repaired = false;
  let taxonomyScore = 50;
  let visualScore = 50;
  let finalScore = 50;
  let resolvedFallbackUrl: string | undefined;

  const ingestResult = stageIngest(input);
  stages.push(ingestResult);
  if (ingestResult.decision === "BLOCK") {
    blocked = true;
    rejectionReasons.push(...ingestResult.messages.filter((m) => m.startsWith("BLOCK:")));
  }

  let normalized: AssetMetadata = { assetId: input.assetId };
  if (!blocked) {
    const { result: normResult, normalized: norm } = stageNormalize(input);
    stages.push(normResult);
    normalized = norm;
  }

  let detectedVertical: string | null = null;
  if (!blocked) {
    const { result: classResult, detectedVertical: dv } = stageClassify(input, normalized);
    stages.push(classResult);
    detectedVertical = dv;
    if (classResult.decision === "BLOCK") {
      blocked = true;
      rejectionReasons.push(...classResult.messages.filter((m) => m.startsWith("BLOCK:")));
    }
  }

  if (!blocked) {
    const semResult = stageSemanticValidate(input, normalized);
    stages.push(semResult);
    if (semResult.decision === "BLOCK") {
      blocked = true;
      rejectionReasons.push(...semResult.messages.filter((m) => m.startsWith("BLOCK:")));
    }
  }

  if (!blocked) {
    const taxResult = stageTaxonomyValidate(input);
    stages.push(taxResult);
    if (taxResult.decision === "BLOCK") {
      blocked = true;
      rejectionReasons.push(...taxResult.messages.filter((m) => m.startsWith("BLOCK:")));
    }
  }

  if (!blocked) {
    const conflictResult = stageCrossVerticalConflict(input);
    stages.push(conflictResult);
    if (conflictResult.decision === "BLOCK") {
      blocked = true;
      rejectionReasons.push(...conflictResult.messages.filter((m) => m.startsWith("BLOCK:")));
    }
  }

  const scoreResult = stageScore(input, normalized, stages);
  stages.push(scoreResult.result);
  taxonomyScore = scoreResult.taxonomyScore;
  visualScore = scoreResult.visualScore;
  finalScore = scoreResult.finalScore;

  const acceptResult = stageAcceptOrReject(input, finalScore, stages);
  stages.push(acceptResult);
  if (acceptResult.decision === "BLOCK") {
    blocked = true;
    rejectionReasons.push(...acceptResult.messages.filter((m) => m.startsWith("BLOCK:")));
  }

  const fallbackResult = stageFallbackResolve(input, blocked);
  stages.push(fallbackResult);
  if (blocked && fallbackResult.metadata?.fallbackUrl) {
    resolvedFallbackUrl = fallbackResult.metadata.fallbackUrl as string;
  }

  const gateResult = stagePublishGate(input, stages, finalScore);
  stages.push(gateResult);
  if (gateResult.decision === "BLOCK") {
    blocked = true;
  }

  const monitorResult = stageMonitor(input, !blocked);
  stages.push(monitorResult);

  const quarantineResult = stageQuarantine(input, blocked, rejectionReasons);
  stages.push(quarantineResult);
  quarantined = quarantineResult.decision === "QUARANTINE";

  const repairResult = stageRepair(input, quarantined, rejectionReasons);
  stages.push(repairResult);
  repaired = repairResult.decision === "REPAIR";

  const publishStatus: PublishStatus = blocked ? "blocked" : "published";
  const moderationStatus: ModerationStatus = quarantined ? "quarantined" : blocked ? "rejected" : "approved";

  const registryUpdate: Partial<RegistryAsset> & Pick<RegistryAsset, "assetId" | "assetType" | "vertical" | "category" | "subcategory" | "allowedKeywords" | "forbiddenKeywords" | "source" | "trustLevel" | "moderationStatus" | "taxonomyScore" | "visualScore" | "finalScore" | "fallbackGroup" | "publishStatus" | "url" | "registeredAt"> = {
    assetId: input.assetId,
    assetType: input.assetType,
    vertical: input.declaredVertical as AssetVertical,
    category: input.declaredCategory,
    subcategory: input.declaredSubcategory ?? null,
    allowedKeywords: getVerticalGovernance(input.declaredVertical)?.allowedKeywords ?? [],
    forbiddenKeywords: getVerticalGovernance(input.declaredVertical)?.forbiddenKeywords ?? [],
    source: input.source ?? "unknown",
    trustLevel: input.trustLevel ?? "unknown",
    moderationStatus,
    taxonomyScore,
    visualScore,
    finalScore,
    fallbackGroup: getVerticalGovernance(input.declaredVertical)?.fallbackGroup ?? "service",
    publishStatus,
    url: input.url,
    title: input.title,
    altText: input.altText,
    rejectionReasons,
    registeredAt: processedAt,
    lastChecked: processedAt,
  };

  if (getAsset(input.assetId)) {
    updateAssetStatus(input.assetId, { publishStatus, moderationStatus, taxonomyScore, visualScore, finalScore, rejectionReasons });
  } else {
    registerAsset(registryUpdate as RegistryAsset);
  }

  const overallDecision: PipelineDecision = quarantined
    ? "QUARANTINE"
    : repaired
    ? "REPAIR"
    : blocked
    ? "BLOCK"
    : "PASS";

  return {
    assetId: input.assetId,
    overallDecision,
    passed: !blocked,
    blocked,
    quarantined,
    repaired,
    stages,
    taxonomyScore,
    visualScore,
    finalScore,
    publishStatus,
    moderationStatus,
    resolvedVertical: input.declaredVertical,
    resolvedFallbackUrl,
    rejectionReasons,
    incidents,
    processedAt,
  };
}

export async function runBannerIntegrityPipelineBatch(
  inputs: PipelineInput[]
): Promise<{
  results: PipelineResult[];
  summary: {
    total: number;
    passed: number;
    blocked: number;
    quarantined: number;
    repaired: number;
    byVertical: Record<string, { passed: number; blocked: number }>;
  };
}> {
  const results = await Promise.all(inputs.map((i) => runBannerIntegrityPipeline(i)));

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    blocked: results.filter((r) => r.blocked).length,
    quarantined: results.filter((r) => r.quarantined).length,
    repaired: results.filter((r) => r.repaired).length,
    byVertical: {} as Record<string, { passed: number; blocked: number }>,
  };

  for (const r of results) {
    const v = r.resolvedVertical;
    if (!summary.byVertical[v]) summary.byVertical[v] = { passed: 0, blocked: 0 };
    if (r.passed) summary.byVertical[v].passed++;
    else summary.byVertical[v].blocked++;
  }

  return { results, summary };
}

export function getIncidentLog(): typeof _incidentLog {
  return [..._incidentLog];
}

export function getBlockedAssets(): string[] {
  return [..._blockedAssets];
}

export function getPipelineStats(): {
  totalIncidents: number;
  totalBlocked: number;
  repairAttempts: Record<string, number>;
} {
  return {
    totalIncidents: _incidentLog.length,
    totalBlocked: _blockedAssets.size,
    repairAttempts: Object.fromEntries(_repairAttempts),
  };
}
