/**
 * Default TestRunner backed by `Deno.Command` (LC2, task #872).
 *
 * Runs Vitest with `--reporter=json` and parses the trailing JSON line to
 * pull pass/fail/skip + coverage. Falls back to exit-code parsing when
 * JSON output is unavailable (e.g. older Vitest versions).
 */

import type { TestRunner } from "./test-adapter.ts";

const TAIL_LIMIT = 8_192;

function tail(s: string, max = TAIL_LIMIT): string {
  if (s.length <= max) return s;
  return s.slice(s.length - max);
}

interface VitestCoverageMetric { pct?: number | null }
interface VitestCoverageTotal {
  lines?: VitestCoverageMetric;
  statements?: VitestCoverageMetric;
  branches?: VitestCoverageMetric;
  functions?: VitestCoverageMetric;
}
interface VitestSummary {
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  // istanbul / v8 summary reporter shape (`coverageMap.total` or
  // `coverage.summary.total`).
  coverageMap?: { total?: VitestCoverageTotal };
  coverage?: { summary?: { total?: VitestCoverageTotal }; total?: VitestCoverageTotal };
}

function parseVitestJson(stdout: string): VitestSummary | null {
  // Vitest prints a single JSON object on the last non-empty line under
  // `--reporter=json`. Be defensive: many CI configs prepend banner text.
  const lines = stdout.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.startsWith("{") && line.endsWith("}")) {
      try { return JSON.parse(line) as VitestSummary; } catch { /* keep scanning */ }
    }
  }
  return null;
}

function extractCoverage(summary: VitestSummary | null): {
  lines: number | null;
  statements: number | null;
  branches: number | null;
  functions: number | null;
} {
  const total: VitestCoverageTotal | undefined =
    summary?.coverageMap?.total ??
    summary?.coverage?.summary?.total ??
    summary?.coverage?.total;
  const pct = (m: VitestCoverageMetric | undefined): number | null =>
    m && typeof m.pct === "number" ? m.pct : null;
  return {
    lines: pct(total?.lines),
    statements: pct(total?.statements),
    branches: pct(total?.branches),
    functions: pct(total?.functions),
  };
}

export function createDenoTestRunner(): TestRunner {
  return async ({ command, workspace, pattern }) => {
    const startedAt = Date.now();
    const parts = command.trim().split(/\s+/);
    const bin = parts[0] ?? "vitest";
    const args = parts.slice(1);
    if (!args.includes("--reporter=json")) args.push("--reporter=json");
    if (pattern) args.push(pattern);

    const proc = new Deno.Command(bin, {
      args,
      cwd: workspace,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await proc.output();
    const durationMs = Date.now() - startedAt;
    const buildMinutes = Math.round((durationMs / 60_000) * 10_000) / 10_000;
    const stdoutText = new TextDecoder().decode(stdout);
    const stderrText = new TextDecoder().decode(stderr);

    const summary = parseVitestJson(stdoutText);
    return {
      exitCode: code,
      passed: summary?.numPassedTests ?? (code === 0 ? 0 : 0),
      failed: summary?.numFailedTests ?? (code === 0 ? 0 : 1),
      skipped: summary?.numPendingTests ?? 0,
      durationMs,
      buildMinutes,
      coverage: extractCoverage(summary),
      stdoutTail: tail(stdoutText),
      stderrTail: tail(stderrText),
    };
  };
}
