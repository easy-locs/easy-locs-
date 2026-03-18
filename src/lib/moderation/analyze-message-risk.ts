/**
 * Simple message risk analyzer — keyword-based content moderation.
 */
export function analyzeMessageRisk(text: string) {
  const lower = text.toLowerCase();

  const spamTerms = ["free money", "guaranteed", "click here", "promo code", "urgent payment"];
  const abuseTerms = ["idiot", "stupid", "hate", "threat", "kill"];
  const fraudTerms = ["send pin", "share otp", "wallet code", "bank password", "crypto recovery"];

  const spamHits = spamTerms.filter((x) => lower.includes(x)).length;
  const abuseHits = abuseTerms.filter((x) => lower.includes(x)).length;
  const fraudHits = fraudTerms.filter((x) => lower.includes(x)).length;

  if (fraudHits > 0) return { flagged: true, type: "fraud" as const, severity: "high" as const };
  if (abuseHits > 0) return { flagged: true, type: "abuse" as const, severity: "medium" as const };
  if (spamHits > 1) return { flagged: true, type: "spam" as const, severity: "medium" as const };

  return { flagged: false } as const;
}
