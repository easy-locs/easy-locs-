import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import type { GovernanceViolation } from "@/domains/shared/canonical-types";

export type TextContext =
  | "card_title"
  | "card_subtitle"
  | "card_body"
  | "page_title"
  | "page_subtitle"
  | "button_label"
  | "banner_title"
  | "banner_subtitle"
  | "input_label"
  | "input_placeholder"
  | "toast_message"
  | "modal_title"
  | "modal_body"
  | "menu_item"
  | "price_label"
  | "badge_text"
  | "tab_label"
  | "chip_label";

const TEXT_LENGTH_RULES: Record<TextContext, { min: number; max: number; lineClamp: number }> = {
  card_title: { min: 2, max: 60, lineClamp: 2 },
  card_subtitle: { min: 0, max: 80, lineClamp: 1 },
  card_body: { min: 0, max: 200, lineClamp: 3 },
  page_title: { min: 2, max: 80, lineClamp: 1 },
  page_subtitle: { min: 0, max: 120, lineClamp: 2 },
  button_label: { min: 1, max: 30, lineClamp: 1 },
  banner_title: { min: 2, max: 50, lineClamp: 1 },
  banner_subtitle: { min: 0, max: 80, lineClamp: 2 },
  input_label: { min: 1, max: 40, lineClamp: 1 },
  input_placeholder: { min: 1, max: 60, lineClamp: 1 },
  toast_message: { min: 1, max: 100, lineClamp: 2 },
  modal_title: { min: 2, max: 60, lineClamp: 1 },
  modal_body: { min: 0, max: 500, lineClamp: 0 },
  menu_item: { min: 1, max: 40, lineClamp: 1 },
  price_label: { min: 1, max: 20, lineClamp: 1 },
  badge_text: { min: 1, max: 15, lineClamp: 1 },
  tab_label: { min: 1, max: 20, lineClamp: 1 },
  chip_label: { min: 1, max: 25, lineClamp: 1 },
};

const FORBIDDEN_PLACEHOLDERS = [
  "lorem ipsum",
  "placeholder",
  "test",
  "todo",
  "fixme",
  "tbd",
  "coming soon",
  "n/a",
  "undefined",
  "null",
  "xxx",
  "asdf",
  "qwerty",
  "sample text",
  "default",
];

const ENCODING_ISSUES = /[\ufffd\u0000-\u0008\u000b\u000c\u000e-\u001f]/;
const MIXED_SCRIPT_PATTERN = /[\u0600-\u06ff].*[a-zA-Z]|[a-zA-Z].*[\u0600-\u06ff]/;

interface TextValidationResult {
  valid: boolean;
  issues: TextIssue[];
  sanitized: string;
  lineClamp: number;
}

interface TextIssue {
  type: "too_long" | "too_short" | "encoding" | "placeholder" | "mixed_script" | "empty" | "overflow_risk";
  message: string;
  severity: "info" | "warning" | "error";
}

const textViolations: GovernanceViolation[] = [];

export function validateText(
  text: string | null | undefined,
  context: TextContext,
  locale?: string
): TextValidationResult {
  const issues: TextIssue[] = [];
  const rules = TEXT_LENGTH_RULES[context];
  const lineClamp = rules.lineClamp;

  if (!text || text.trim().length === 0) {
    if (rules.min > 0) {
      issues.push({
        type: "empty",
        message: `Empty text in ${context} context (minimum ${rules.min} chars)`,
        severity: "error",
      });
    }
    return { valid: issues.length === 0, issues, sanitized: "", lineClamp };
  }

  let sanitized = text.trim();

  if (sanitized.length > rules.max) {
    issues.push({
      type: "too_long",
      message: `Text exceeds ${rules.max} chars for ${context} (got ${sanitized.length})`,
      severity: "warning",
    });
    sanitized = sanitized.slice(0, rules.max - 1) + "…";
  }

  if (sanitized.length < rules.min) {
    issues.push({
      type: "too_short",
      message: `Text below ${rules.min} chars for ${context}`,
      severity: "warning",
    });
  }

  if (ENCODING_ISSUES.test(sanitized)) {
    issues.push({
      type: "encoding",
      message: "Broken encoding characters detected",
      severity: "error",
    });
    sanitized = sanitized.replace(ENCODING_ISSUES, "");
  }

  const lower = sanitized.toLowerCase();
  for (const forbidden of FORBIDDEN_PLACEHOLDERS) {
    if (lower === forbidden || lower.startsWith(forbidden + " ")) {
      issues.push({
        type: "placeholder",
        message: `Forbidden placeholder content: "${forbidden}"`,
        severity: "error",
      });
      break;
    }
  }

  if (locale && !locale.startsWith("ar") && MIXED_SCRIPT_PATTERN.test(sanitized)) {
    issues.push({
      type: "mixed_script",
      message: "Mixed Arabic/Latin script detected in non-Arabic locale",
      severity: "warning",
    });
  }

  if (lineClamp === 1 && sanitized.length > rules.max * 0.8) {
    issues.push({
      type: "overflow_risk",
      message: `Single-line text at ${Math.round((sanitized.length / rules.max) * 100)}% capacity — overflow risk`,
      severity: "info",
    });
  }

  const hasErrors = issues.some((i) => i.severity === "error");

  if (hasErrors) {
    textViolations.push({
      id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "text_integrity",
      severity: "error",
      source: `text:${context}`,
      target: "validation",
      message: issues.map((i) => i.message).join("; "),
      ownerDomain: "platform",
      vertical: "platform",
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
      autoRemediated: false,
      metadata: { context, locale, originalLength: text.length },
    });
  }

  return { valid: !hasErrors, issues, sanitized, lineClamp };
}

export function getTextRules(context: TextContext) {
  return TEXT_LENGTH_RULES[context];
}

export function getTextViolations(): GovernanceViolation[] {
  return [...textViolations];
}

export class TextIntegrityEngine extends BaseEngine {
  constructor() {
    super({
      id: "text-integrity",
      name: "Text Integrity Engine",
      category: "governance",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const recent = textViolations.filter(
      (v) => Date.now() - new Date(v.detectedAt).getTime() < this.intervalMs
    );

    return {
      level: recent.length > 0 ? "detect" : "observe",
      findings: recent.length,
      actions: recent
        .filter((v) => v.severity === "error")
        .map((v) => `TEXT_FIX: ${v.message}`),
      duration: 0,
    };
  }
}
