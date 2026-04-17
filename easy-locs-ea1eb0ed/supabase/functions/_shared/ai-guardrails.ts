// Next-Gen IA guardrails: prompt-injection, PII redaction, moderation.
// Returns structured decisions; callers decide whether to block or sanitize.
//
// LB Closeout #852 — moderation HTTP call now lives inside `_shared/ai-router.ts`
// (the canonical, allow-listed home for `api.openai.com` host calls). This
// module just consumes the helper so guardrail logic stays focused on
// classification, not transport.
import { moderateText } from "./ai-router.ts";

export type GuardrailDecision =
  | { allowed: true; sanitized: string; flags: string[] }
  | { allowed: false; reason: "prompt_injection" | "pii" | "moderation"; details: string };

const INJECTION_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "ignore_previous", re: /\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above)\b/i },
  { name: "system_override", re: /\b(you\s+are\s+now|act\s+as|pretend\s+to\s+be)\s+[a-z0-9\- ]{3,40}/i },
  { name: "reveal_system", re: /\b(reveal|print|show|leak|exfiltrate)\b.{0,40}\b(system\s+prompt|instructions|api\s*key|secret)/i },
  { name: "developer_mode", re: /\b(developer|god|jailbreak|DAN|sudo)\s*mode\b/i },
  { name: "token_markers", re: /<\|(im_start|im_end|system|endoftext)\|>/i },
  { name: "role_hijack", re: /^\s*(system|assistant)\s*:/im },
];

const PII_PATTERNS: Array<{ name: string; re: RegExp; replace: string }> = [
  { name: "email",    re: /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi,           replace: "[REDACTED_EMAIL]" },
  { name: "phone",    re: /(?:\+?\d[\s\-.]?){7,15}\d/g,                          replace: "[REDACTED_PHONE]" },
  { name: "iban",     re: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,                   replace: "[REDACTED_IBAN]" },
  { name: "credit_card", re: /\b(?:\d[ \-]*?){13,19}\b/g,                        replace: "[REDACTED_CARD]" },
  { name: "ssn_fr_nir", re: /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g, replace: "[REDACTED_NIR]" },
  { name: "api_key",  re: /\b(?:sk|pk|rk|xai|api|secret)[_\-][A-Za-z0-9]{16,}\b/g, replace: "[REDACTED_KEY]" },
];

export interface GuardrailOptions {
  redactPii?: boolean;     // default: true (sanitize, keep going)
  blockOnPii?: boolean;    // default: false
  checkModeration?: boolean; // default: true when OPENAI_API_KEY present
  maxLength?: number;      // default: 16_000 chars
}

export function detectPromptInjection(input: string): { found: boolean; pattern?: string } {
  for (const p of INJECTION_PATTERNS) {
    if (p.re.test(input)) return { found: true, pattern: p.name };
  }
  return { found: false };
}

export function redactPii(input: string): { output: string; flags: string[] } {
  let out = input;
  const flags: string[] = [];
  for (const p of PII_PATTERNS) {
    if (p.re.test(out)) {
      flags.push(p.name);
      out = out.replace(p.re, p.replace);
    }
  }
  return { output: out, flags };
}

export async function applyGuardrails(
  input: string,
  opts: GuardrailOptions = {},
): Promise<GuardrailDecision> {
  const {
    redactPii: doRedact = true,
    blockOnPii = false,
    checkModeration = true,
    maxLength = 16_000,
  } = opts;

  const flags: string[] = [];
  const trimmed = input.slice(0, maxLength);

  const inj = detectPromptInjection(trimmed);
  if (inj.found) {
    return { allowed: false, reason: "prompt_injection", details: inj.pattern ?? "pattern" };
  }

  let sanitized = trimmed;
  const { output: piiOut, flags: piiFlags } = redactPii(sanitized);
  if (piiFlags.length > 0) {
    if (blockOnPii) {
      return { allowed: false, reason: "pii", details: piiFlags.join(",") };
    }
    sanitized = doRedact ? piiOut : sanitized;
    flags.push(...piiFlags.map((f) => `pii:${f}`));
  }

  if (checkModeration) {
    const mod = await moderateText(sanitized);
    if (mod?.flagged) {
      return { allowed: false, reason: "moderation", details: mod.categories.join(",") };
    }
  }

  return { allowed: true, sanitized, flags };
}

export function sanitizeAssistantOutput(output: string): string {
  // Scrub anything that looks like a leaked secret from model output.
  return redactPii(output).output;
}
