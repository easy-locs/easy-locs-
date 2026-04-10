import { describe, it, expect } from "vitest";
import {
  isExemptFile,
  classifySupabaseUsage,
  generateArchitectureReport,
} from "@/lib/quality/architecture-audit";
import {
  scanForTechnicalLeaks,
  generateTechnicalLeakReport,
} from "@/lib/quality/technical-leak-scanner";
import {
  detectDuplicationInPage,
  detectDuplicateStateOwnership,
  generateDuplicationReport,
} from "@/lib/quality/duplication-detector";
import {
  scanForHardcodedStrings,
  scanForMissingI18nUsage,
  generateI18nReport,
} from "@/lib/quality/i18n-validator";
import {
  buildControlBoard,
  formatControlBoard,
} from "@/lib/quality/control-board";

describe("Architecture Audit", () => {
  it("exempts auth/service files", () => {
    expect(isExemptFile("src/contexts/AuthContext.tsx")).toBe(true);
    expect(isExemptFile("src/repositories/call.repository.ts")).toBe(true);
    expect(isExemptFile("src/domains/orbit/service.ts")).toBe(true);
    expect(isExemptFile("src/stores/walletStore.ts")).toBe(true);
  });

  it("flags page-level files", () => {
    expect(isExemptFile("src/pages/SomePage.tsx")).toBe(false);
    expect(isExemptFile("src/components/SomeComponent.tsx")).toBe(false);
  });

  it("classifies supabase usage types", () => {
    expect(classifySupabaseUsage(['.from("table")'])).toBe("data_query");
    expect(classifySupabaseUsage(['.channel("name")'])).toBe("realtime");
    expect(classifySupabaseUsage([".auth.getSession()"])).toBe("auth");
    expect(classifySupabaseUsage(['.from("x")', '.channel("y")'])).toBe("mixed");
  });

  it("generates architecture report", () => {
    const report = generateArchitectureReport([
      { file: "test.tsx", line: 1, message: "test", severity: "high", usageType: "data_query" },
    ]);
    expect(report.status).toBe("PARTIAL");
    expect(report.criticalViolations).toBe(1);
  });
});

describe("Technical Leak Scanner", () => {
  it("detects JSON.stringify in render", () => {
    const content = 'return <div>{JSON.stringify(data)}</div>';
    const violations = scanForTechnicalLeaks(content, "src/pages/Test.tsx");
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].severity).toBe("critical");
  });

  it("detects backend name leak", () => {
    const content = '<p>Error from postgres: table not found</p>';
    const violations = scanForTechnicalLeaks(content, "src/pages/Test.tsx");
    expect(violations.length).toBeGreaterThan(0);
  });

  it("ignores comments", () => {
    const content = '// JSON.stringify debug\n/* postgres test */';
    const violations = scanForTechnicalLeaks(content, "src/pages/Test.tsx");
    expect(violations.length).toBe(0);
  });

  it("generates leak report", () => {
    const report = generateTechnicalLeakReport([]);
    expect(report.status).toBe("PASS");
    expect(report.totalViolations).toBe(0);
  });
});

describe("Duplication Detector", () => {
  it("detects duplicate component usage in single file", () => {
    const content = [
      '<RadarSmartSearch query={q} />',
      '<div>stuff</div>',
      '<RadarSmartSearch query={q2} />',
    ].join("\n");
    const violations = detectDuplicationInPage(content, "src/pages/Radar.tsx");
    expect(violations.length).toBeGreaterThan(0);
  });

  it("detects duplicate state declarations", () => {
    const content = [
      'const [loading, setLoading] = useState(false);',
      'const [data, setData] = useState(null);',
      'const [loading, setLoading] = useState(true);',
    ].join("\n");
    const violations = detectDuplicateStateOwnership(content, "src/pages/Test.tsx");
    expect(violations.length).toBe(1);
    expect(violations[0].message).toContain("loading");
  });

  it("generates duplication report", () => {
    const report = generateDuplicationReport([]);
    expect(report.status).toBe("PASS");
  });
});

describe("i18n Validator", () => {
  it("detects hardcoded user-facing strings", () => {
    const content = '<h1>Welcome to the dashboard</h1>';
    const violations = scanForHardcodedStrings(content, "src/pages/Dashboard.tsx");
    expect(violations.length).toBeGreaterThan(0);
  });

  it("allows brand names", () => {
    const content = '<h1>Easy-Locs Platform</h1>';
    const violations = scanForHardcodedStrings(content, "src/pages/Landing.tsx");
    expect(violations.length).toBe(0);
  });

  it("detects missing i18n in component with many strings", () => {
    const content = [
      'export default function Test() {',
      '  return (',
      '    <div>',
      '      <h1>Welcome message here</h1>',
      '      <p>Description of feature</p>',
      '      <button>Click to continue</button>',
      '      <span>Another label text</span>',
      '    </div>',
      '  );',
      '}',
    ].join("\n");
    const violations = scanForMissingI18nUsage(content, "src/components/Test.tsx");
    expect(violations.length).toBeGreaterThan(0);
  });

  it("does not flag files with t() usage", () => {
    const content = [
      'export default function Test() {',
      '  return <div>{t("welcome")}</div>;',
      '}',
    ].join("\n");
    const violations = scanForMissingI18nUsage(content, "src/components/Test.tsx");
    expect(violations.length).toBe(0);
  });
});

describe("Control Board", () => {
  it("builds a complete board from audit results", () => {
    const board = buildControlBoard([
      {
        system: "architecture-discipline",
        status: "PASS",
        totalViolations: 0,
        criticalViolations: 0,
        violations: [],
        summary: "Clean",
      },
    ]);

    expect(board.systems.sentry).toBeDefined();
    expect(board.systems.playwright).toBe("MISSING");
    expect(board.routes.dashboard).toBe("PASS");
    expect(board.counts.directBackendViolations).toBe(0);
    expect(board.counts.i18nViolations).toBe(0);
    expect(board.systems.i18n).toBe("MISSING");
  });

  it("derives route FAIL from critical violations", () => {
    const board = buildControlBoard([
      {
        system: "technical-leak-scanner",
        status: "FAIL",
        totalViolations: 1,
        criticalViolations: 1,
        violations: [
          { file: "src/pages/HyperRadarPage.tsx", line: 10, message: "JSON.stringify leak", severity: "critical" },
        ],
        summary: "1 critical leak",
      },
    ]);

    expect(board.routes.radar).toBe("FAIL");
    expect(board.criticalFlows.radar).toBe("FAIL");
    expect(board.counts.unstableRoutes).toBeGreaterThan(0);
  });

  it("integrates i18n audit into board", () => {
    const board = buildControlBoard([
      {
        system: "i18n-validator",
        status: "PARTIAL",
        totalViolations: 5,
        criticalViolations: 0,
        violations: [],
        summary: "5 hardcoded strings",
      },
    ]);

    expect(board.systems.i18n).toBe("PARTIAL");
    expect(board.counts.i18nViolations).toBe(5);
  });

  it("formats board as readable string", () => {
    const board = buildControlBoard([]);
    const formatted = formatControlBoard(board);
    expect(formatted).toContain("CONTROL BOARD");
    expect(formatted).toContain("SYSTEMS");
    expect(formatted).toContain("ROUTES");
    expect(formatted).toContain("CRITICAL FLOWS");
    expect(formatted).toContain("CRITICAL COUNTS");
  });
});
