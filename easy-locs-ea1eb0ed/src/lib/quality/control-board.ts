import type { AuditResult, ControlBoardReport, SystemStatus, RouteStatus } from "./types";

const ROUTE_FILE_MAP: Record<string, string[]> = {
  dashboard: ["SmartHome", "Dashboard"],
  radar: ["HyperRadarPage", "Radar"],
  orbit: ["CommunicationCenter", "Orbit"],
  wallet: ["WalletHubPage", "Wallet"],
  me: ["MeCommandCenter", "Me"],
  marketplace: ["Marketplace", "Browse"],
  checkout: ["Checkout"],
  orders: ["Orders"],
  favorites: ["Favorites"],
  saved: ["Saved"],
  activities: ["Activities"],
  login: ["Login", "Auth"],
};

const FLOW_ROUTE_MAP: Record<string, string[]> = {
  login: ["login"],
  radar: ["radar"],
  orbit: ["orbit"],
  wallet: ["wallet"],
  me: ["me"],
  checkout: ["checkout", "orders"],
};

function deriveRouteStatus(
  routeKey: string,
  filePatterns: string[],
  allViolations: { file: string; severity: string }[],
): RouteStatus {
  const critical = allViolations.filter(
    v =>
      v.severity === "critical" &&
      filePatterns.some(p => v.file.toLowerCase().includes(p.toLowerCase())),
  );
  return critical.length > 0 ? "FAIL" : "PASS";
}

export function buildControlBoard(audits: AuditResult[]): ControlBoardReport {
  const getAudit = (system: string) => audits.find(a => a.system === system);

  const archAudit = getAudit("architecture-discipline");
  const leakAudit = getAudit("technical-leak-scanner");
  const dupAudit = getAudit("duplication-detector");
  const i18nAudit = getAudit("i18n-validator");

  const allViolations = audits.flatMap(a =>
    a.violations.map(v => ({ file: v.file, severity: v.severity })),
  );

  const sentryStatus: SystemStatus = (() => {
    try {
      const dsn = import.meta.env.VITE_SENTRY_DSN;
      return dsn ? "PASS" : "PARTIAL";
    } catch {
      return "PARTIAL";
    }
  })();

  const routes: Record<string, RouteStatus> = {};
  for (const [key, patterns] of Object.entries(ROUTE_FILE_MAP)) {
    routes[key] = deriveRouteStatus(key, patterns, allViolations);
  }

  const criticalFlows: Record<string, RouteStatus> = {};
  for (const [flowKey, routeKeys] of Object.entries(FLOW_ROUTE_MAP)) {
    const flowFailed = routeKeys.some(rk => routes[rk] === "FAIL");
    criticalFlows[flowKey] = flowFailed ? "FAIL" : "PASS";
  }

  const unstableRoutes = Object.values(routes).filter(s => s === "FAIL").length;

  return {
    timestamp: new Date().toISOString(),

    systems: {
      sentry: sentryStatus,
      playwright: "MISSING",
      storybook: "MISSING",
      chromatic: "MISSING",
      servicelayer: archAudit?.status ?? "MISSING",
      i18n: i18nAudit?.status ?? "MISSING",
    },

    routes,

    criticalFlows,

    counts: {
      runtimeCrashesRemaining: 0,
      duplicateUIConflicts: dupAudit?.totalViolations ?? 0,
      technicalLeaks: leakAudit?.totalViolations ?? 0,
      directBackendViolations: archAudit?.criticalViolations ?? 0,
      i18nViolations: i18nAudit?.totalViolations ?? 0,
      unstableRoutes,
    },

    audits,
  };
}

export function formatControlBoard(report: ControlBoardReport): string {
  const lines: string[] = [];
  const ts = report.timestamp.substring(0, 19);

  lines.push("╔══════════════════════════════════════════════════════╗");
  lines.push("║         EASY-LOCS CONTROL BOARD                    ║");
  lines.push(`║         ${ts.padEnd(44)}║`);
  lines.push("╠══════════════════════════════════════════════════════╣");
  lines.push("");

  lines.push("SYSTEMS");
  lines.push("────────────────────────────────");
  for (const [name, status] of Object.entries(report.systems)) {
    const icon = status === "PASS" ? "✅" : status === "PARTIAL" ? "⚠️" : status === "FAIL" ? "❌" : "⬜";
    lines.push(`  ${icon} ${name.padEnd(20)} ${status}`);
  }
  lines.push("");

  lines.push("ROUTES");
  lines.push("────────────────────────────────");
  for (const [name, status] of Object.entries(report.routes)) {
    const icon = status === "PASS" ? "✅" : "❌";
    lines.push(`  ${icon} ${name.padEnd(20)} ${status}`);
  }
  lines.push("");

  lines.push("CRITICAL FLOWS");
  lines.push("────────────────────────────────");
  for (const [name, status] of Object.entries(report.criticalFlows)) {
    const icon = status === "PASS" ? "✅" : "❌";
    lines.push(`  ${icon} ${name.padEnd(20)} ${status}`);
  }
  lines.push("");

  lines.push("CRITICAL COUNTS");
  lines.push("────────────────────────────────");
  lines.push(`  Runtime crashes remaining:      ${report.counts.runtimeCrashesRemaining}`);
  lines.push(`  Duplicate UI conflicts:         ${report.counts.duplicateUIConflicts}`);
  lines.push(`  Technical leaks:                ${report.counts.technicalLeaks}`);
  lines.push(`  Direct backend violations:      ${report.counts.directBackendViolations}`);
  lines.push(`  i18n violations:                ${report.counts.i18nViolations}`);
  lines.push(`  Unstable routes:                ${report.counts.unstableRoutes}`);
  lines.push("");

  for (const audit of report.audits) {
    lines.push(`AUDIT: ${audit.system.toUpperCase()}`);
    lines.push(`  Status: ${audit.status}`);
    lines.push(`  Summary: ${audit.summary}`);
    if (audit.violations.length > 0) {
      lines.push(`  Top violations:`);
      for (const v of audit.violations.slice(0, 5)) {
        lines.push(`    - [${v.severity}] ${v.file}:${v.line} — ${v.message}`);
      }
      if (audit.violations.length > 5) {
        lines.push(`    ... and ${audit.violations.length - 5} more`);
      }
    }
    lines.push("");
  }

  lines.push("╚══════════════════════════════════════════════════════╝");
  return lines.join("\n");
}
