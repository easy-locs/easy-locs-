const SPAM_PATTERNS = [
  /\b(buy now|click here|free money|earn \$|limited offer|act now|subscribe|discount code)\b/i,
  /(https?:\/\/|www\.)\S+/i,
  /(.)\1{5,}/,
  /[A-Z\s]{20,}/,
];

const INSULT_WORDS = [
  "idiot", "stupid", "dumb", "moron", "loser", "trash", "garbage",
  "scam", "scammer", "fraud", "fake", "cheat", "sucks",
  "hate", "disgusting", "horrible", "worst", "terrible", "awful",
  "connard", "merde", "putain", "salaud", "enculé",
];

const INSULT_REGEX = new RegExp(
  `\\b(${INSULT_WORDS.join("|")})\\b`,
  "gi"
);

export interface ModerationResult {
  blocked: boolean;
  reason?: string;
  flags: string[];
  cleanedText: string;
}

export function moderateReviewContent(text: string): ModerationResult {
  const flags: string[] = [];

  if (!text || text.trim().length === 0) {
    return { blocked: false, flags: [], cleanedText: "" };
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      flags.push("spam");
      break;
    }
  }

  const insultMatches = text.match(INSULT_REGEX);
  if (insultMatches && insultMatches.length > 0) {
    flags.push("inappropriate_language");
  }

  if (text.length < 3) {
    flags.push("too_short");
  }

  const blocked = flags.includes("spam") || (insultMatches && insultMatches.length >= 3);

  let cleanedText = text;
  if (insultMatches) {
    cleanedText = text.replace(INSULT_REGEX, (match) => match[0] + "*".repeat(match.length - 1));
  }

  return {
    blocked: !!blocked,
    reason: blocked
      ? flags.includes("spam")
        ? "Your review appears to contain spam content"
        : "Your review contains too many inappropriate words"
      : undefined,
    flags,
    cleanedText: blocked ? text : cleanedText,
  };
}
