// Lightweight client-side guardrails — mirrors the server edge version.
// Use for pre-validation of user inputs before sending to AI endpoints, so UI
// can display immediate feedback. Final authoritative check happens server-side.

const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above)\b/i,
  /\b(you\s+are\s+now|act\s+as|pretend\s+to\s+be)\s+[a-z0-9\- ]{3,40}/i,
  /\b(reveal|print|show|leak|exfiltrate)\b.{0,40}\b(system\s+prompt|instructions|api\s*key|secret)/i,
  /\b(developer|god|jailbreak|DAN|sudo)\s*mode\b/i,
  /<\|(im_start|im_end|system|endoftext)\|>/i,
  /^\s*(system|assistant)\s*:/im,
];

const PII_PATTERNS: Array<{ name: string; re: RegExp; replace: string }> = [
  { name: "email",    re: /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi,           replace: "[REDACTED_EMAIL]" },
  { name: "phone",    re: /(?:\+?\d[\s\-.]?){7,15}\d/g,                          replace: "[REDACTED_PHONE]" },
  { name: "iban",     re: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,                   replace: "[REDACTED_IBAN]" },
  { name: "credit_card", re: /\b(?:\d[ \-]*?){13,19}\b/g,                        replace: "[REDACTED_CARD]" },
  { name: "api_key",  re: /\b(?:sk|pk|rk|xai|api|secret)[_\-][A-Za-z0-9]{16,}\b/g, replace: "[REDACTED_KEY]" },
];

export interface ClientGuardrailResult {
  safe: boolean;
  reason?: "prompt_injection" | "pii";
  sanitized: string;
  piiFlags: string[];
}

export function detectPromptInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(input));
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

export function validateUserInput(input: string, opts: { blockOnPii?: boolean } = {}): ClientGuardrailResult {
  if (detectPromptInjection(input)) {
    return { safe: false, reason: "prompt_injection", sanitized: input, piiFlags: [] };
  }
  const { output, flags } = redactPii(input);
  if (flags.length > 0 && opts.blockOnPii) {
    return { safe: false, reason: "pii", sanitized: output, piiFlags: flags };
  }
  return { safe: true, sanitized: output, piiFlags: flags };
}
