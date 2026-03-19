/**
 * DINO V7 — Auto UI Repair (Safe Mode)
 * Automatically fixes known safe UI issues without developer intervention.
 */

import { sanitizeUiText } from "@/lib/design/textSanitizer";

export interface SafeFixRule {
  id: string;
  type: "text" | "spacing" | "layout" | "media" | "accessibility";
  description: string;
  safetyLevel: "safe" | "moderate" | "risky";
  autoApply: boolean;
}

export interface SafeFixResult {
  ruleId: string;
  applied: boolean;
  entityType: string;
  entityId: string;
  before: string;
  after: string;
  description: string;
  rollbackData: Record<string, unknown>;
}

const SAFE_FIX_RULES: SafeFixRule[] = [
  { id: "fix_dotted_labels", type: "text", description: "Replace dotted labels with clean text", safetyLevel: "safe", autoApply: true },
  { id: "fix_empty_labels", type: "text", description: "Replace empty labels with placeholder", safetyLevel: "safe", autoApply: true },
  { id: "fix_excessive_whitespace", type: "text", description: "Trim excessive whitespace in text", safetyLevel: "safe", autoApply: true },
  { id: "fix_capitalization", type: "text", description: "Fix inconsistent capitalization", safetyLevel: "safe", autoApply: true },
  { id: "fix_image_aspect", type: "media", description: "Add aspect-ratio to images without dimensions", safetyLevel: "moderate", autoApply: false },
  { id: "fix_tap_target_size", type: "accessibility", description: "Increase small tap targets to 44px", safetyLevel: "moderate", autoApply: false },
  { id: "fix_overflow_hidden", type: "layout", description: "Add overflow-x-hidden to overflowing containers", safetyLevel: "moderate", autoApply: false },
];

export function applySafeTextFixes(texts: { id: string; value: string }[]): SafeFixResult[] {
  const results: SafeFixResult[] = [];

  for (const t of texts) {
    const sanitized = sanitizeUiText(t.value);
    if (sanitized !== t.value) {
      results.push({
        ruleId: "fix_dotted_labels",
        applied: true,
        entityType: "text",
        entityId: t.id,
        before: t.value,
        after: sanitized,
        description: `Fixed label: "${t.value}" → "${sanitized}"`,
        rollbackData: { originalValue: t.value },
      });
    }

    // Trim excessive whitespace
    const trimmed = t.value.replace(/\s{2,}/g, " ").trim();
    if (trimmed !== t.value && sanitized === t.value) {
      results.push({
        ruleId: "fix_excessive_whitespace",
        applied: true,
        entityType: "text",
        entityId: t.id,
        before: t.value,
        after: trimmed,
        description: `Trimmed whitespace in "${t.id}"`,
        rollbackData: { originalValue: t.value },
      });
    }
  }

  return results;
}

export function getSafeFixRules(): SafeFixRule[] {
  return [...SAFE_FIX_RULES];
}

/** Rollback storage for safe fixes */
const ROLLBACK_STORE: Map<string, SafeFixResult> = new Map();

export function storeRollback(result: SafeFixResult) {
  ROLLBACK_STORE.set(`${result.entityType}:${result.entityId}:${result.ruleId}`, result);
}

export function getRollbackData(entityType: string, entityId: string, ruleId: string): SafeFixResult | undefined {
  return ROLLBACK_STORE.get(`${entityType}:${entityId}:${ruleId}`);
}

export function getAllRollbacks(): SafeFixResult[] {
  return Array.from(ROLLBACK_STORE.values());
}
