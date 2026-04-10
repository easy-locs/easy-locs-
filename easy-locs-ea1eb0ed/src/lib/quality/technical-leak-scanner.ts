import type { AuditResult, AuditViolation } from "./types";

const LEAK_PATTERNS: Array<{ pattern: RegExp; label: string; severity: "critical" | "high" | "medium" }> = [
  { pattern: /\[object Object\]/i, label: "[object Object] rendered", severity: "critical" },
  { pattern: /Not supported/i, label: '"Not supported" text leak', severity: "high" },
  { pattern: /undefined/i, label: '"undefined" displayed', severity: "high" },
  { pattern: /null/i, label: '"null" displayed', severity: "medium" },
  { pattern: /NaN/i, label: '"NaN" displayed', severity: "high" },
  { pattern: /TODO:/i, label: "TODO placeholder visible", severity: "medium" },
  { pattern: /FIXME:/i, label: "FIXME placeholder visible", severity: "medium" },
  { pattern: /console\.log/i, label: "Console.log in production render", severity: "medium" },
  { pattern: /DEBUG/i, label: "DEBUG text leak", severity: "medium" },
  { pattern: /PLACEHOLDER/i, label: "PLACEHOLDER text leak", severity: "medium" },
  { pattern: /lorem ipsum/i, label: "Lorem ipsum placeholder", severity: "medium" },
];

const RENDER_LEAK_PATTERNS: Array<{ pattern: RegExp; label: string; severity: "critical" | "high" | "medium" }> = [
  { pattern: />\s*\{[^}]*\.toString\(\)\}/, label: "Raw .toString() in JSX", severity: "high" },
  { pattern: />\s*\{JSON\.stringify/, label: "JSON.stringify in render output", severity: "critical" },
  { pattern: /Error:\s/, label: "Raw error message exposed to user", severity: "high" },
  { pattern: /stack\s*:/, label: "Stack trace exposed", severity: "critical" },
  { pattern: /postgres|supabase|postgrest/i, label: "Backend technology name exposed", severity: "critical" },
];

export function scanForTechnicalLeaks(content: string, filePath: string): AuditViolation[] {
  const violations: AuditViolation[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;
    if (/import\s/.test(line)) continue;
    if (/console\.(log|warn|error|debug|info)/.test(line)) continue;
    if (/\.test\.|\.spec\./.test(filePath)) continue;

    for (const { pattern, label, severity } of RENDER_LEAK_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: i + 1,
          message: label,
          severity,
          code: line.trim().slice(0, 120),
        });
      }
    }
  }

  return violations;
}

export function scanUserFacingStrings(content: string, filePath: string): AuditViolation[] {
  const violations: AuditViolation[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*(\/\/|\/\*|\*|import\s)/.test(line)) continue;
    if (/\.test\.|\.spec\./.test(filePath)) continue;

    const jsxTextMatch = line.match(/>\s*([^<>{]+)\s*</);
    if (jsxTextMatch) {
      const text = jsxTextMatch[1].trim();
      for (const { pattern, label, severity } of LEAK_PATTERNS) {
        if (pattern.test(text) && text.length < 200) {
          violations.push({
            file: filePath,
            line: i + 1,
            message: `User-facing text leak: ${label}`,
            severity,
            code: text.slice(0, 120),
          });
        }
      }
    }
  }

  return violations;
}

export function generateTechnicalLeakReport(violations: AuditViolation[]): AuditResult {
  const critical = violations.filter(v => v.severity === "critical").length;
  const high = violations.filter(v => v.severity === "high").length;

  return {
    system: "technical-leak-scanner",
    status: critical > 0 ? "FAIL" : high > 0 ? "PARTIAL" : "PASS",
    totalViolations: violations.length,
    criticalViolations: critical,
    violations,
    summary: `${critical} critical, ${high} high, ${violations.length - critical - high} medium technical leaks`,
  };
}
