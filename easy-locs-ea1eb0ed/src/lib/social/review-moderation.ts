/**
 * review-moderation — Client-side content moderation for user review text.
 * Checks for profanity, spam, and abuse patterns; returns a cleaned copy.
 * Mirrors the server-side rules in content-moderation-engine.ts so that
 * bad content is caught before it reaches the edge function.
 */

const PROFANITY_PATTERNS: RegExp[] = [
  /\bfuck\b/gi, /\bshit\b/gi, /\bbitc?h\b/gi, /\bdamn\b/gi,
  /\bcrap\b/gi, /\bhate\b/gi, /\bterror\b/gi,
  /\bbomb\b/gi, /\bweapon\b/gi, /\bdrug[s]?\b/gi,
  /\bheroin\b/gi, /\bcocain\b/gi, /\bprostitut/gi,
  /\bporn\b/gi, /\bxxx\b/gi,
];

const SPAM_PATTERNS: RegExp[] = [
  /click here now/gi, /buy now!/gi, /100% free/gi,
  /limited time offer/gi, /congratulations you won/gi, /act now/gi,
  /risk.?free/gi, /no credit check/gi, /guaranteed income/gi,
  /make money fast/gi,
];

export interface ModerationResult {
  /** Whether the review should be blocked entirely. */
  blocked: boolean;
  /** Human-readable reason shown to the user when blocked. */
  reason?: string;
  /** Sanitised text with profanity replaced by asterisks. */
  cleanedText: string;
}

function mask(text: string, pattern: RegExp): string {
  return text.replace(pattern, (match) => "*".repeat(match.length));
}

/**
 * Evaluate review text and return a moderation result.
 * - Spam patterns → blocked (reason provided).
 * - Profanity → profanity is masked in `cleanedText` but the review is NOT blocked
 *   unless it is exclusively profanity (> 50% of words flagged).
 */
export function moderateReviewContent(text: string): ModerationResult {
  const trimmed = text.trim();

  // Spam check — block entirely
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        blocked: true,
        reason: "Your review appears to contain spam content.",
        cleanedText: trimmed,
      };
    }
  }

  // Profanity check — mask and count
  let cleaned = trimmed;
  let flagCount = 0;
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(cleaned)) {
      flagCount++;
      cleaned = mask(cleaned, pattern);
    }
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length || 1;
  if (flagCount / wordCount > 0.5) {
    return {
      blocked: true,
      reason: "Your review contains inappropriate language.",
      cleanedText: cleaned,
    };
  }

  return { blocked: false, cleanedText: cleaned };
}
