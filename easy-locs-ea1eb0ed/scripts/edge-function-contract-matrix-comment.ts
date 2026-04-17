#!/usr/bin/env -S npx tsx
/**
 * Build the PR-comment body for the Edge Function Contract Matrix workflow.
 *
 * Reads the machine-readable matrix produced by
 * `scripts/edge-function-contract-matrix.ts` (which writes
 * `docs/edge-functions-contract-matrix.json`) and emits a Markdown file
 * suitable for posting as a sticky PR comment.
 *
 * Two states:
 *   - Clean   (no blocking mismatches): emits a green "✓ contract matrix
 *             clean" message with high-level totals.
 *   - Failing (>= 1 blocking mismatch): emits the "Blocking mismatches"
 *             table — same structure as the table in
 *             `docs/edge-functions-contract-matrix.md` — so the reviewer
 *             can act inline on the PR without downloading the artifact.
 *
 * Blocking kinds (must match the matrix script's `HARD_KINDS`):
 *   `orphan`, `method`, `missing-field`, `missing-body`,
 *   `missing-auth-header`.
 *
 * Usage:
 *   npx tsx scripts/edge-function-contract-matrix-comment.ts [out.md]
 *
 * If no output path is provided, writes to
 * `<repo-root>/edge-fn-contract-comment.md`.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const JSON_IN = path.join(ROOT, "docs", "edge-functions-contract-matrix.json");

interface Mismatch {
  kind: string;
  fn: string;
  caller: string;
  detail: string;
}

interface Caller {
  file: string;
  line: number;
  kind: string;
  method: string;
}

interface Entry {
  fn: string;
  exists: boolean;
  callers: Caller[];
  mismatches: Mismatch[];
}

interface Totals {
  callSites: number;
  uniqueTargets: number;
  contractCoverage: string;
  orphanedFrontendCalls: number;
  methodMismatches: number;
  missingFieldMismatches: number;
  missingBodyMismatches: number;
  missingAuthHeaderMismatches: number;
}

interface Matrix {
  entries: Entry[];
  totals: Totals;
}

const HARD_KINDS = new Set([
  "orphan",
  "method",
  "missing-field",
  "missing-body",
  "missing-auth-header",
]);

const MAX_ROWS = 50;

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function build(matrix: Matrix, staleArtifact: boolean): string {
  const blocking: Mismatch[] = [];
  for (const e of matrix.entries) {
    if (!e.exists) {
      for (const c of e.callers) {
        blocking.push({
          kind: "orphan",
          fn: e.fn,
          caller: `${c.file}:${c.line}`,
          detail: `${c.kind} ${c.method} — function does not exist on disk`,
        });
      }
    }
    for (const m of e.mismatches) {
      if (HARD_KINDS.has(m.kind)) blocking.push(m);
    }
  }

  const t = matrix.totals;
  const totalsLine = `_${t.callSites} call sites · ${t.uniqueTargets} unique targets · contract coverage ${t.contractCoverage}._`;

  const lines: string[] = [];
  lines.push("## Edge Function Contract Matrix");
  lines.push("");

  if (blocking.length === 0) {
    if (staleArtifact) {
      lines.push(
        "⚠️ contract matrix is stale — no blocking mismatches, but the committed `docs/edge-functions-contract-matrix.{md,json}` does not match freshly-generated output. Run `npm run contracts:matrix` and commit the regenerated docs to unblock CI.",
      );
    } else {
      lines.push("✓ contract matrix clean — no blocking mismatches.");
    }
    lines.push("");
    lines.push(totalsLine);
    lines.push("");
    return lines.join("\n");
  }

  lines.push(
    `❌ ${blocking.length} blocking mismatch(es) detected — CI is failing.`,
  );
  if (staleArtifact) {
    lines.push("");
    lines.push(
      "⚠️ The committed contract matrix docs are also stale relative to freshly-generated output — regenerating with `npm run contracts:matrix` is part of the fix.",
    );
  }
  lines.push("");
  lines.push(
    "Blocking kinds: `orphan`, `method`, `missing-field`, `missing-body`, `missing-auth-header`. Regenerate locally with `npm run contracts:matrix` and commit the updated `docs/edge-functions-contract-matrix.{md,json}` once each row below is resolved.",
  );
  lines.push("");
  lines.push("### Blocking mismatches");
  lines.push("");
  lines.push("| Kind | Function | Caller | Detail |");
  lines.push("| --- | --- | --- | --- |");

  for (const b of blocking.slice(0, MAX_ROWS)) {
    lines.push(
      `| ${b.kind} | \`${escapeCell(b.fn)}\` | \`${escapeCell(b.caller)}\` | ${escapeCell(b.detail)} |`,
    );
  }
  if (blocking.length > MAX_ROWS) {
    lines.push("");
    lines.push(
      `_…and ${blocking.length - MAX_ROWS} more — see the full \`docs/edge-functions-contract-matrix.md\` artifact attached to this workflow run._`,
    );
  }
  lines.push("");
  lines.push(totalsLine);
  lines.push("");
  return lines.join("\n");
}

function main() {
  if (!fs.existsSync(JSON_IN)) {
    console.error(
      `edge-function-contract-matrix.json not found at ${JSON_IN}. Run \`npm run contracts:matrix\` first.`,
    );
    process.exit(2);
  }
  const matrix = JSON.parse(fs.readFileSync(JSON_IN, "utf8")) as Matrix;
  const staleArtifact =
    process.env.STALE_ARTIFACT === "1" || process.env.STALE_ARTIFACT === "true";
  const body = build(matrix, staleArtifact);
  const outPath = path.resolve(
    process.argv[2] ?? path.join(ROOT, "edge-fn-contract-comment.md"),
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, body);
  const blockingCount = (body.match(/^\| (?:orphan|method|missing-field|missing-body|missing-auth-header) \|/gm) ?? [])
    .length;
  console.log(
    `Wrote ${path.relative(ROOT, outPath)} (${blockingCount} blocking row(s) rendered)`,
  );
}

main();
