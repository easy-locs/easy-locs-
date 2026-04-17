/**
 * Tiny unified-diff generator for the code.edit adapter (LC1, task #871).
 *
 * We do NOT pull in `diff` or `jsdiff` — the adapter only needs to emit a
 * reviewer-readable, RFC-style unified diff (one hunk per file) for the
 * orchestrator's structured output. The format matches `diff -u`:
 *
 *   --- a/<path>
 *   +++ b/<path>
 *   @@ -<oldStart>,<oldLen> +<newStart>,<newLen> @@
 *   -line removed
 *   +line added
 *    line unchanged
 *
 * The hunk window contains EVERY line of the file rather than a sliding
 * window — sufficient for an MVP that targets small/medium files and keeps
 * the implementation deterministic and dependency-free.
 */

function splitLines(text: string): string[] {
  if (text === "") return [];
  // Preserve a trailing newline as an empty entry so diff math stays correct.
  const parts = text.split("\n");
  return parts;
}

function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const t: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        t[i][j] = t[i - 1][j - 1] + 1;
      } else {
        t[i][j] = Math.max(t[i - 1][j], t[i][j - 1]);
      }
    }
  }
  return t;
}

interface DiffLine {
  kind: " " | "-" | "+";
  text: string;
}

function diffLines(a: string[], b: string[]): DiffLine[] {
  const t = lcsTable(a, b);
  const out: DiffLine[] = [];
  let i = a.length;
  let j = b.length;
  const stack: DiffLine[] = [];
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      stack.push({ kind: " ", text: a[i - 1] });
      i--;
      j--;
    } else if (t[i - 1][j] >= t[i][j - 1]) {
      stack.push({ kind: "-", text: a[i - 1] });
      i--;
    } else {
      stack.push({ kind: "+", text: b[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    stack.push({ kind: "-", text: a[i - 1] });
    i--;
  }
  while (j > 0) {
    stack.push({ kind: "+", text: b[j - 1] });
    j--;
  }
  for (let k = stack.length - 1; k >= 0; k--) out.push(stack[k]);
  return out;
}

/**
 * Build a unified-diff string for a single file. Returns "" when before
 * and after are byte-identical.
 */
export function buildUnifiedDiff(path: string, before: string, after: string): string {
  if (before === after) return "";
  const a = splitLines(before);
  const b = splitLines(after);
  const lines = diffLines(a, b);
  const oldLen = lines.filter((l) => l.kind !== "+").length;
  const newLen = lines.filter((l) => l.kind !== "-").length;
  const header = `--- a/${path}\n+++ b/${path}\n@@ -${a.length === 0 ? 0 : 1},${oldLen} +${b.length === 0 ? 0 : 1},${newLen} @@`;
  const body = lines.map((l) => `${l.kind}${l.text}`).join("\n");
  return `${header}\n${body}\n`;
}

/**
 * Apply an anchored substring replacement. Returns null when the find
 * string is absent OR ambiguous (multiple occurrences) so the caller can
 * fail loud rather than silently picking one.
 */
export function applyAnchoredReplace(
  source: string,
  find: string,
  replace: string,
): { ok: true; result: string } | { ok: false; reason: "not_found" | "ambiguous" } {
  if (find === "") return { ok: false, reason: "not_found" };
  const first = source.indexOf(find);
  if (first === -1) return { ok: false, reason: "not_found" };
  const second = source.indexOf(find, first + find.length);
  if (second !== -1) return { ok: false, reason: "ambiguous" };
  return {
    ok: true,
    result: source.slice(0, first) + replace + source.slice(first + find.length),
  };
}
