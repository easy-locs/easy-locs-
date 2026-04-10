import type { AuditResult, AuditViolation } from "./types";

const HARDCODED_STRING_PATTERN = />\s*["']?([A-Z][a-z]+(?:\s+[a-z]+){1,})\s*["']?\s*</;

const SKIP_PATTERNS = [
  /className/,
  /style=/,
  /import\s/,
  /^\s*(\/\/|\*|\/\*)/,
  /console\./,
  /type\s*=/,
  /key\s*=/,
  /data-/,
  /aria-/,
  /role="/,
  /\.test\./,
  /\.spec\./,
];

const ALLOWED_HARDCODED = [
  /Easy-Locs/i,
  /Google/,
  /Apple/,
  /WhatsApp/,
  /Facebook/,
  /Instagram/,
  /LinkedIn/,
  /Twitter/,
  /Stripe/,
  /PayPal/,
  /SEPA/,
  /IBAN/,
  /BIC/,
  /SWIFT/,
  /USD|EUR|GBP|AED|XOF|MAD/,
  /OK/,
  /GPS/,
  /QR/,
  /SMS/,
  /URL/,
  /API/,
  /PDF/,
  /CSV/,
];

export function scanForHardcodedStrings(content: string, filePath: string): AuditViolation[] {
  if (/\.test\.|\.spec\.|i18n|__tests__|node_modules/.test(filePath)) return [];

  const violations: AuditViolation[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (SKIP_PATTERNS.some(p => p.test(line))) continue;

    const jsxText = line.match(/>\s*([A-Z][a-zA-Zéèêëàâäùûüôöïîç\s'-]{4,50})\s*</);
    if (jsxText) {
      const text = jsxText[1].trim();
      if (ALLOWED_HARDCODED.some(p => p.test(text))) continue;
      if (/\{/.test(text)) continue;

      violations.push({
        file: filePath,
        line: i + 1,
        message: `Potential hardcoded user-facing string: "${text}"`,
        severity: "medium",
        code: line.trim().slice(0, 120),
      });
    }
  }

  return violations;
}

export function scanForMissingI18nUsage(content: string, filePath: string): AuditViolation[] {
  if (/\.test\.|\.spec\.|i18n|__tests__/.test(filePath)) return [];
  if (!/\.(tsx)$/.test(filePath)) return [];

  const violations: AuditViolation[] = [];

  const hasUserFacingContent = /return\s*\(/.test(content) && /</.test(content);
  if (!hasUserFacingContent) return [];

  const usesT = /\bt\(/.test(content) || /useTranslation|useI18n/.test(content);
  const hasSignificantStrings = (content.match(/>\s*[A-Z][a-zA-Z\s]{4,}/g) || []).length;

  if (!usesT && hasSignificantStrings > 3) {
    violations.push({
      file: filePath,
      line: 1,
      message: `Component has ${hasSignificantStrings} user-facing strings but no i18n usage`,
      severity: "medium",
      code: `No t() or useTranslation found, ${hasSignificantStrings} hardcoded strings`,
    });
  }

  return violations;
}

export function generateI18nReport(violations: AuditViolation[]): AuditResult {
  const critical = violations.filter(v => v.severity === "critical").length;
  const high = violations.filter(v => v.severity === "high").length;

  return {
    system: "i18n-validator",
    status: critical > 0 ? "FAIL" : violations.length > 20 ? "PARTIAL" : "PASS",
    totalViolations: violations.length,
    criticalViolations: critical,
    violations,
    summary: `${violations.length} i18n issues (${critical} critical, ${high} high, ${violations.length - critical - high} medium)`,
  };
}
