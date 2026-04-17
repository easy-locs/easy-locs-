/**
 * Sensitive-output classifier — LB1 (#815).
 *
 * Pure heuristic gate that runs over the completion text (or RAG answer)
 * before the AI adapter returns SUCCESS. When it fires, the adapter sets
 * `flaggedSensitive=true` on the result and the orchestrator's post-execute
 * hook flips the task into `pending_review` so a human approver can release
 * it via the L5 inbox before the response is delivered.
 *
 * The classifier is deliberately conservative — it would rather over-flag
 * (annoying) than under-flag (legal/compliance hazard). Tunable signals:
 *
 *   - PII patterns: emails, phone numbers, IBANs, credit-card-like sequences
 *   - Contract / financial keywords (multi-language: en, fr, ar)
 *   - Moderation: explicit caller hint via payload.sensitive=true
 *
 * No model call inside the classifier (would deadlock on the same registry).
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// E.164-ish or local-format phone with at least 8 digits.
const PHONE_RE = /(?:\+?\d[\s().-]?){8,}/;
// IBAN: country code + check digits + 11..30 alnum.
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/;
// 13–19 contiguous digits (loose card heuristic; we DO NOT validate Luhn —
// false positives are acceptable for "should a human look at this?").
const CARD_RE = /\b\d{13,19}\b/;

const CONTRACT_KEYWORDS = [
  // english
  "contract", "agreement", "indemnif", "liability", "termination",
  "lawsuit", "legal action", "non-disclosure", "nda",
  // french
  "contrat", "responsabilité", "résiliation", "litige",
  // arabic
  "عقد", "اتفاقية", "مسؤولية",
];

const FINANCIAL_KEYWORDS = [
  "wire transfer", "wire-transfer", "bank account", "iban", "swift code",
  "routing number", "social security", "ssn", "tax id",
  "virement", "rib",
];

export interface SensitiveSignal {
  flagged: boolean;
  reason?: string;
  matchedPatterns?: string[];
}

export interface SensitiveContext {
  /** Caller-side hint (e.g. KYC review surface). */
  callerHint?: boolean;
  /** Free-form feature tag — currently unused in scoring but kept for
   *  forward-compat (e.g. always-flag list of features). */
  feature?: string;
}

export function classifySensitiveOutput(
  text: string,
  ctx: SensitiveContext = {},
): SensitiveSignal {
  if (!text) return { flagged: false };

  if (ctx.callerHint === true) {
    return { flagged: true, reason: "caller_hint", matchedPatterns: ["caller_hint"] };
  }

  const matched: string[] = [];

  if (EMAIL_RE.test(text)) matched.push("pii.email");
  if (PHONE_RE.test(text)) matched.push("pii.phone");
  if (IBAN_RE.test(text)) matched.push("pii.iban");
  if (CARD_RE.test(text)) matched.push("pii.card_like");

  const lower = text.toLowerCase();
  for (const kw of CONTRACT_KEYWORDS) {
    if (lower.includes(kw)) {
      matched.push(`contract.${kw}`);
      break; // one is enough
    }
  }
  for (const kw of FINANCIAL_KEYWORDS) {
    if (lower.includes(kw)) {
      matched.push(`financial.${kw}`);
      break;
    }
  }

  if (matched.length === 0) return { flagged: false };
  return {
    flagged: true,
    reason: matched[0].split(".")[0],
    matchedPatterns: matched,
  };
}
