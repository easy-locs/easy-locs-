import type { AuditResult, AuditViolation } from "./types";

export interface DuplicationPattern {
  id: string;
  label: string;
  description: string;
  filePattern: RegExp;
  contentPattern: RegExp;
  severity: "critical" | "high" | "medium";
}

export const DUPLICATION_PATTERNS: DuplicationPattern[] = [
  {
    id: "duplicate-search-bar",
    label: "Duplicate search bar",
    description: "Multiple search bar components rendering in same view",
    filePattern: /\.(tsx)$/,
    contentPattern: /RadarSmartSearch|SearchBar|searchbar|search-bar/i,
    severity: "high",
  },
  {
    id: "duplicate-category-chips",
    label: "Duplicate category chips",
    description: "Multiple category chip sets in same page",
    filePattern: /\.(tsx)$/,
    contentPattern: /LayerChips|CategoryChips|LAYER_DEFS\.map/i,
    severity: "high",
  },
  {
    id: "duplicate-bottom-sheet",
    label: "Duplicate bottom sheet",
    description: "Multiple bottom sheet overlays competing",
    filePattern: /\.(tsx)$/,
    contentPattern: /BottomSheet|bottom-sheet|Sheet.*snap/i,
    severity: "medium",
  },
  {
    id: "duplicate-sort-bar",
    label: "Duplicate sort bar",
    description: "Multiple sort controls in same view",
    filePattern: /\.(tsx)$/,
    contentPattern: /SortBar|SORT_OPTIONS|sort-bar/i,
    severity: "medium",
  },
  {
    id: "duplicate-recommendation",
    label: "Duplicate recommendation section",
    description: "Multiple recommendation surfaces competing",
    filePattern: /\.(tsx)$/,
    contentPattern: /Recommended|recommendation|SmartRecommend/i,
    severity: "medium",
  },
  {
    id: "duplicate-weather-widget",
    label: "Duplicate weather widget",
    description: "Multiple weather displays in same view",
    filePattern: /\.(tsx)$/,
    contentPattern: /WeatherWidget|weather-widget/i,
    severity: "medium",
  },
];

export interface DuplicationFinding {
  patternId: string;
  label: string;
  files: string[];
  occurrences: number;
  severity: "critical" | "high" | "medium";
  risk: string;
}

export function detectDuplicationInPage(content: string, filePath: string): AuditViolation[] {
  const violations: AuditViolation[] = [];
  const lines = content.split("\n");

  for (const pattern of DUPLICATION_PATTERNS) {
    if (!pattern.filePattern.test(filePath)) continue;

    const matchingLines = lines
      .map((line, idx) => ({ line, idx }))
      .filter(({ line }) => pattern.contentPattern.test(line) && !/import\s/.test(line) && !/^\s*(\/\/|\*)/.test(line));

    if (matchingLines.length > 1) {
      violations.push({
        file: filePath,
        line: matchingLines[0].idx + 1,
        message: `${pattern.label}: ${matchingLines.length} occurrences in same file`,
        severity: pattern.severity,
        code: matchingLines.map(m => `L${m.idx + 1}: ${m.line.trim().slice(0, 80)}`).join(" | "),
      });
    }
  }

  return violations;
}

export function detectDuplicateStateOwnership(content: string, filePath: string): AuditViolation[] {
  const violations: AuditViolation[] = [];
  const lines = content.split("\n");

  const stateDeclarations = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => /useState\(/.test(line));

  const stateNames = new Map<string, number[]>();
  for (const { line, idx } of stateDeclarations) {
    const match = line.match(/\[\s*(\w+)\s*,/);
    if (match) {
      const name = match[1];
      if (!stateNames.has(name)) stateNames.set(name, []);
      stateNames.get(name)!.push(idx + 1);
    }
  }

  for (const [name, lineNums] of stateNames) {
    if (lineNums.length > 1) {
      violations.push({
        file: filePath,
        line: lineNums[0],
        message: `Duplicate state declaration: "${name}" declared ${lineNums.length} times`,
        severity: "high",
        code: `Lines: ${lineNums.join(", ")}`,
      });
    }
  }

  return violations;
}

export function generateDuplicationReport(violations: AuditViolation[]): AuditResult {
  const critical = violations.filter(v => v.severity === "critical").length;
  const high = violations.filter(v => v.severity === "high").length;

  return {
    system: "duplication-detector",
    status: critical > 0 ? "FAIL" : high > 0 ? "PARTIAL" : "PASS",
    totalViolations: violations.length,
    criticalViolations: critical,
    violations,
    summary: `${violations.length} duplication issues found (${critical} critical, ${high} high)`,
  };
}
