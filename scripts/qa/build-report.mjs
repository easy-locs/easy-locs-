#!/usr/bin/env node
/**
 * Aggregate Playwright + k6 results into docs/qa/bug-surfacing-report.md.
 *
 * Inputs (all optional — missing inputs degrade gracefully):
 *   - test-results/playwright-results.json   (Playwright JSON reporter)
 *   - test-results/k6-smoke-summary.json     (k6 handleSummary)
 *   - test-results/k6-load-summary.json
 *   - test-results/k6-stress-summary.json
 *
 * Output: docs/qa/bug-surfacing-report.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const OUT = resolve(ROOT, 'docs/qa/bug-surfacing-report.md');

function readJson(p) {
  try {
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
  } catch (e) {
    return { __error: String(e) };
  }
}

function severityFor(test) {
  const title = (test.title || '').toLowerCase();
  if (/login|auth|payment|wallet/.test(title)) return 'S1';
  if (/dashboard|orders|notifications/.test(title)) return 'S2';
  if (/refresh|back|forward|multi-tab/.test(title)) return 'S3';
  return 'S4';
}

function collectPlaywrightFindings(json) {
  const bugs = [];
  const weak = [];
  if (!json || !json.suites) return { bugs, weak };
  const walk = (suite, parents = []) => {
    const path = [...parents, suite.title].filter(Boolean);
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        const result = (t.results || []).at(-1);
        if (!result) continue;
        const route = (path.join(' › ') || spec.title || '').slice(0, 200);
        const profileMatch = /\[(\w+)\]/.exec(spec.title) || /\[(\w+)\]/.exec(path.join(' '));
        const role = profileMatch ? profileMatch[1] : 'unknown';
        const artifacts = (result.attachments || [])
          .filter((a) => /screenshot|video|trace/.test(a.name))
          .map((a) => `[${a.name}](${a.path || a.contentType})`)
          .join(', ');
        if (result.status === 'failed' || result.status === 'timedOut') {
          bugs.push({
            route,
            role,
            severity: severityFor(spec),
            repro: spec.title,
            hypothesis: result.error?.message?.split('\n')[0] || 'unknown',
            artifacts: artifacts || '—',
          });
        } else if ((result.duration || 0) > 30_000 || (t.results || []).length > 1) {
          weak.push({
            route,
            role,
            symptom: 'slow or flaky',
            durationMs: result.duration || 0,
            retries: (t.results || []).length - 1,
          });
        }
      }
    }
    for (const child of suite.suites || []) walk(child, path);
  };
  for (const s of json.suites) walk(s);
  return { bugs, weak };
}

function collectK6Findings(stages) {
  const rows = [];
  for (const [stage, summary] of Object.entries(stages)) {
    if (!summary || summary.__error) continue;
    const metrics = summary.metrics || {};
    const dur = metrics.http_req_duration?.values || {};
    const failed = metrics.http_req_failed?.values || {};
    const errRate = failed.rate ?? failed.value ?? 0;
    rows.push({
      stage,
      p50: dur['p(50)']?.toFixed?.(1) ?? '—',
      p95: dur['p(95)']?.toFixed?.(1) ?? '—',
      p99: dur['p(99)']?.toFixed?.(1) ?? '—',
      errPct: (errRate * 100).toFixed(2),
      breaking:
        errRate > 0.01 || (dur['p(95)'] || 0) > 800 ? 'threshold exceeded' : 'within thresholds',
    });
  }
  return rows;
}

function rankFixes(bugs, weak, perf) {
  const items = [];
  for (const b of bugs) {
    const sevWeight = { S1: 10, S2: 6, S3: 3, S4: 1 }[b.severity] || 1;
    items.push({
      title: `Fix ${b.severity}: ${b.repro}`,
      area: b.route,
      score: sevWeight * 5,
    });
  }
  for (const w of weak) {
    items.push({ title: `Stabilize weak flow: ${w.route}`, area: w.route, score: 3 });
  }
  for (const p of perf) {
    if (p.breaking !== 'within thresholds') {
      items.push({
        title: `Performance: investigate ${p.stage} stage breach`,
        area: 'backend',
        score: 8,
      });
    }
  }
  return items.sort((a, b) => b.score - a.score);
}

function md(parts) {
  return parts.join('\n');
}

function main() {
  const pw = readJson(resolve(ROOT, 'test-results/playwright-results.json'));
  const k6 = {
    smoke: readJson(resolve(ROOT, 'test-results/k6-smoke-summary.json')),
    load: readJson(resolve(ROOT, 'test-results/k6-load-summary.json')),
    stress: readJson(resolve(ROOT, 'test-results/k6-stress-summary.json')),
  };

  const { bugs, weak } = collectPlaywrightFindings(pw);
  const perf = collectK6Findings(k6);
  const fixes = rankFixes(bugs, weak, perf);

  const lines = [];
  lines.push('# Bug Surfacing Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  if (!pw && !k6.smoke && !k6.load && !k6.stress) {
    lines.push('> ⚠️ No Playwright or k6 result files were found in `test-results/`.');
    lines.push('> Run `npm run qa:campaign` (see `docs/qa/how-to-run.md`) and re-run');
    lines.push('> `node scripts/qa/build-report.mjs` to populate the sections below.');
    lines.push('');
  }

  lines.push('## 1. Confirmed Bugs');
  lines.push('');
  if (bugs.length === 0) {
    lines.push('_No failing Playwright tests recorded._');
  } else {
    lines.push('| Severity | Route | Role | Repro | Root-cause hypothesis | Artifact |');
    lines.push('|---|---|---|---|---|---|');
    for (const b of bugs) {
      lines.push(
        `| ${b.severity} | \`${b.route}\` | ${b.role} | ${b.repro} | ${b.hypothesis} | ${b.artifacts} |`,
      );
    }
  }
  lines.push('');

  lines.push('## 2. Weak Flows');
  lines.push('');
  if (weak.length === 0) {
    lines.push('_No flaky or slow flows detected._');
  } else {
    lines.push('| Route | Role | Symptom | Duration (ms) | Retries |');
    lines.push('|---|---|---|---:|---:|');
    for (const w of weak) {
      lines.push(`| \`${w.route}\` | ${w.role} | ${w.symptom} | ${w.durationMs} | ${w.retries} |`);
    }
  }
  lines.push('');

  lines.push('## 3. Performance Bottlenecks');
  lines.push('');
  if (perf.length === 0) {
    lines.push('_No k6 stage summaries available._');
  } else {
    lines.push('| Stage | p50 (ms) | p95 (ms) | p99 (ms) | Error % | Status |');
    lines.push('|---|---:|---:|---:|---:|---|');
    for (const r of perf) {
      lines.push(`| ${r.stage} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.errPct} | ${r.breaking} |`);
    }
  }
  lines.push('');

  lines.push('## 4. Recommended Fixes (ranked by impact × reach ÷ effort)');
  lines.push('');
  if (fixes.length === 0) {
    lines.push('_Nothing to recommend — all signals green._');
  } else {
    lines.push('| Rank | Score | Recommendation | Target area |');
    lines.push('|---:|---:|---|---|');
    fixes.forEach((f, i) => {
      lines.push(`| ${i + 1} | ${f.score} | ${f.title} | \`${f.area}\` |`);
    });
  }
  lines.push('');

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, md(lines), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`wrote ${OUT}`);
}

main();
