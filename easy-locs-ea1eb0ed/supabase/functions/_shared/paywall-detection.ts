export const PAYWALL_INDICATORS = [
  "subscribe to continue",
  "subscribe to read",
  "subscription required",
  "premium content",
  "members only",
  "paywall",
  "sign in to read",
  "log in to continue",
  "create a free account",
  "register to continue",
  "abonnez-vous",
  "réservé aux abonnés",
  "contenu réservé",
  "accès réservé",
  "article réservé",
  "pour lire la suite",
  "connectez-vous",
  "créez votre compte",
];

export const PAYWALL_META_PATTERNS = [
  /isAccessibleForFree["']?\s*[:=]\s*["']?false/i,
  /content_access\s*[:=]\s*["']?paid/i,
  /paywall\s*[:=]\s*["']?true/i,
];

export function detectPaywall(html: string): boolean {
  const lower = html.toLowerCase();
  const textOnly = lower.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  for (const indicator of PAYWALL_INDICATORS) {
    if (textOnly.includes(indicator)) return true;
  }

  for (const pattern of PAYWALL_META_PATTERNS) {
    if (pattern.test(html)) return true;
  }

  return false;
}
