import type { DetectedIssue, ProtectionReport } from "./types";
import {
  detectRenderMismatch,
  detectTaxonomyMismatch,
  detectMediaIssues,
  detectPipelineIssues,
  detectImportIssues,
  detectWalletInconsistency,
  detectOtpAbuse,
  detectSuspiciousAuth,
  detectOrbitCorruption,
  detectPublicPageInvalid,
  detectCardBroken,
} from "./issue-detector";
import { reactToIssue, processDetectedIssues } from "./protection-reactor";
import { checkRateLimit, isRateLimited, peekRateLimit } from "./rate-limiter";
import type { RenderableEntity, RenderContract } from "@/lib/rendering/contracts";
import type { PipelineResult, MediaAsset } from "@/domains/content-pipeline/types";

export function protectRender(entity: RenderableEntity, contract: RenderContract): ProtectionReport | null {
  const issue = detectRenderMismatch(entity, contract);
  if (!issue) return null;
  return reactToIssue(issue);
}

export function protectTaxonomy(
  entityId: string,
  vertical: string,
  category: string,
  subcategory: string,
  canonicalType: string,
  canonicalPath: string,
): ProtectionReport | null {
  const issue = detectTaxonomyMismatch(entityId, vertical, category, subcategory, canonicalType, canonicalPath);
  if (!issue) return null;
  return reactToIssue(issue);
}

export function protectMedia(entityId: string, media: MediaAsset[], canonicalType: string): ProtectionReport[] {
  const issues = detectMediaIssues(entityId, media, canonicalType);
  return processDetectedIssues(issues);
}

export function protectPipeline(result: PipelineResult): ProtectionReport[] {
  const issues = detectPipelineIssues(result);
  return processDetectedIssues(issues);
}

export function protectImport(entityId: string, source: string, issues: string[], confidence: number): ProtectionReport[] {
  const detected = detectImportIssues(entityId, source, issues, confidence);
  return processDetectedIssues(detected);
}

export function protectWalletFlow(userId: string, issue: string, metadata: Record<string, unknown> = {}): ProtectionReport {
  const detected = detectWalletInconsistency(userId, issue, metadata);
  return reactToIssue(detected);
}

export function protectOtpFlow(userId: string, attemptCount: number, windowMinutes: number): ProtectionReport | null {
  const userKey = `identity.otp.request.${userId}`;
  const rlState = checkRateLimit(userKey);
  if (rlState.blocked) {
    const issue = detectOtpAbuse(userId, rlState.count, windowMinutes);
    if (issue) return reactToIssue(issue);
  }

  const issue = detectOtpAbuse(userId, attemptCount, windowMinutes);
  if (!issue) return null;
  return reactToIssue(issue);
}

export function protectAuthFlow(userId: string, reason: string, metadata: Record<string, unknown> = {}): ProtectionReport {
  const issue = detectSuspiciousAuth(userId, reason, metadata);
  return reactToIssue(issue);
}

export function protectOrbitThread(conversationId: string, reason: string, metadata: Record<string, unknown> = {}): ProtectionReport {
  const issue = detectOrbitCorruption(conversationId, reason, metadata);
  return reactToIssue(issue);
}

export function protectPublicPage(entityId: string, route: string, reason: string): ProtectionReport {
  const issue = detectPublicPageInvalid(entityId, route, reason);
  return reactToIssue(issue);
}

export function protectCard(entityId: string, component: string, reason: string, metadata: Record<string, unknown> = {}): ProtectionReport {
  const issue = detectCardBroken(entityId, component, reason, metadata);
  return reactToIssue(issue);
}

export function isOtpRateLimited(): boolean {
  return isRateLimited("identity.otp.request");
}

export function isTransferRateLimited(): boolean {
  return isRateLimited("wallet.transfer.submit");
}

export function checkTransferRateLimit(): { blocked: boolean; remaining: number } {
  const state = peekRateLimit("wallet.transfer.submit");
  return { blocked: state.blocked, remaining: Math.max(0, state.limit - state.count) };
}
