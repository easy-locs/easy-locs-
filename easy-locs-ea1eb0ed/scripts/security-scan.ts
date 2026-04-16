import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPORT_FILE = path.join(ROOT, "security-report.json");
const PUBLIC_REPORT_FILE = path.join(ROOT, "public/security-report.json");

interface VulnerabilityEntry {
  name: string;
  severity: "critical" | "high" | "moderate" | "low" | "info";
  title: string;
  url: string;
  range: string;
  fixAvailable: boolean;
}

interface SecurityReport {
  timestamp: string;
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
  vulnerabilities: VulnerabilityEntry[];
  verdict: "PASS" | "WARN" | "FAIL";
}

function runNpmAudit(): SecurityReport {
  let raw: string;
  try {
    raw = execSync("npm audit --json 2>/dev/null", {
      cwd: ROOT,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err: unknown) {
    const execErr = err as { stdout?: string };
    raw = execErr.stdout || "{}";
  }

  interface NpmAuditVulnEntry {
    severity?: string;
    via?: Array<{ title?: string; url?: string } | string>;
    range?: string;
    fixAvailable?: boolean | object;
  }

  interface NpmAuditOutput {
    vulnerabilities?: Record<string, NpmAuditVulnEntry>;
  }

  let parsed: NpmAuditOutput;
  try {
    parsed = JSON.parse(raw) as NpmAuditOutput;
  } catch {
    parsed = {};
  }

  const vulns: VulnerabilityEntry[] = [];
  const counts = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };

  if (parsed.vulnerabilities) {
    for (const [name, data] of Object.entries(parsed.vulnerabilities)) {
      const severity = (data.severity || "info") as VulnerabilityEntry["severity"];
      counts[severity] = (counts[severity] || 0) + 1;
      const firstVia = data.via?.[0];
      const viaTitle = typeof firstVia === "object" && firstVia !== null ? firstVia.title : (typeof firstVia === "string" ? firstVia : undefined);
      const viaUrl = typeof firstVia === "object" && firstVia !== null ? firstVia.url : undefined;
      vulns.push({
        name,
        severity,
        title: viaTitle || "Unknown",
        url: viaUrl || "",
        range: data.range || "*",
        fixAvailable: !!data.fixAvailable,
      });
    }
  }

  const total = vulns.length;
  let verdict: SecurityReport["verdict"] = "PASS";
  if (counts.critical > 0) verdict = "FAIL";
  else if (counts.high > 0) verdict = "WARN";

  return {
    timestamp: new Date().toISOString(),
    total,
    ...counts,
    vulnerabilities: vulns.sort(
      (a, b) => severityRank(b.severity) - severityRank(a.severity)
    ),
    verdict,
  };
}

function severityRank(s: string): number {
  const ranks: Record<string, number> = { critical: 5, high: 4, moderate: 3, low: 2, info: 1 };
  return ranks[s] || 0;
}

function printReport(report: SecurityReport): void {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║              Security Vulnerability Report                  ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Scanned at:  ${report.timestamp.padEnd(45)}║`);
  console.log(`║  Total:       ${String(report.total).padEnd(45)}║`);
  console.log(`║  Critical:    ${String(report.critical).padEnd(45)}║`);
  console.log(`║  High:        ${String(report.high).padEnd(45)}║`);
  console.log(`║  Moderate:    ${String(report.moderate).padEnd(45)}║`);
  console.log(`║  Low:         ${String(report.low).padEnd(45)}║`);
  console.log(`║  Verdict:     ${report.verdict.padEnd(45)}║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");

  if (report.vulnerabilities.length > 0) {
    console.log("║  Top vulnerabilities:                                       ║");
    for (const v of report.vulnerabilities.slice(0, 20)) {
      const line = `  [${v.severity.toUpperCase()}] ${v.name}: ${typeof v.title === "string" ? v.title.slice(0, 40) : v.name}`;
      console.log(`║${line.padEnd(62)}║`);
    }
  }
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
}

const report = runNpmAudit();
printReport(report);
const reportJson = JSON.stringify(report, null, 2);
fs.writeFileSync(REPORT_FILE, reportJson, "utf-8");

const reportForBrowser = JSON.stringify({
  critical: report.critical,
  high: report.high,
  moderate: report.moderate,
  low: report.low,
  info: report.info,
  total: report.total,
  advisories: report.vulnerabilities.map((v) => ({
    name: v.name,
    severity: v.severity,
    title: typeof v.title === "string" ? v.title : v.name,
    fixAvailable: v.fixAvailable,
  })),
}, null, 2);
fs.writeFileSync(PUBLIC_REPORT_FILE, reportForBrowser, "utf-8");
console.log(`Report saved to: ${REPORT_FILE}`);
console.log(`Browser report saved to: ${PUBLIC_REPORT_FILE}`);

if (report.verdict === "FAIL") {
  console.error("❌ CRITICAL vulnerabilities found — flagging build.");
  process.exit(1);
}
