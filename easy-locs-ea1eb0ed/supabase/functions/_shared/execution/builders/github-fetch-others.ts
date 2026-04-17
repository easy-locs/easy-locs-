/**
 * LC4 — GitHub-backed `fetchOthers` resolver (task #880).
 *
 * Builds the comparison set the drift-detector hook needs:
 *   1. Every OPEN pull request whose head branch is not the current
 *      branch (the parallel dev branches we could conflict with).
 *   2. Every commit merged to the default branch (`main` by default)
 *      since the current branch was cut.
 *
 * For each entry we resolve the touched files + new-side line ranges
 * by parsing the `patch` field of GitHub's diff payloads. Hunk headers
 * have the form `@@ -a,b +c,d @@`; we extract the `+c,d` range so
 * `FileChange.startLine / endLine` correspond to the post-change file.
 *
 * STRICTLY READ-ONLY. Every request is GET. No PR is opened, closed,
 * commented on, or merged here — that responsibility lives with the
 * builder's `mergePr` callback (and is gated by the drift hook).
 */

import type {
  BranchChanges,
  FileChange,
} from "../drift-detector.ts";

const GITHUB_API = "https://api.github.com";

export interface GithubFetchOthersOptions {
  /** GitHub token with `repo:read` (or PR-read scope on a fine-grained PAT). */
  pat: string;
  /** "owner/repo". */
  repo: string;
  /** The branch the LC4 builder is about to merge (excluded from comparison). */
  currentBranch: string;
  /** ISO timestamp the current branch was cut from main. Required so we
   *  only compare against commits that landed AFTER the branch point —
   *  earlier commits are already in the branch's history. */
  branchCutAt: string;
  /** Default branch name (the merge target). Defaults to "main". */
  defaultBranch?: string;
  /** Page size cap for both PR list + commit list. Default 30. */
  perPage?: number;
  /** Optional injected fetch (used by tests). Defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
}

/** A GitHub diff entry as returned by the PR-files / commit endpoints. */
interface GithubDiffFile {
  filename: string;
  status?: string;
  patch?: string;
}

interface GithubPullSummary {
  number: number;
  head: { ref: string; sha: string };
  base: { ref: string };
  state: string;
}

interface GithubCommitSummary {
  sha: string;
  commit: { message: string };
}

// ── Hunk-header parsing ──────────────────────────────────────────────────

const HUNK_HEADER_RE = /^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,(\d+))?\s+@@/;

/**
 * Returns the new-side `[start, end]` line ranges touched by a unified
 * diff `patch`. Pure / side-effect free / deterministic — exposed for
 * unit tests.
 */
export function parsePatchRanges(
  patch: string | undefined | null,
): Array<{ startLine: number; endLine: number }> {
  if (!patch) return [];
  const ranges: Array<{ startLine: number; endLine: number }> = [];
  for (const line of patch.split("\n")) {
    const m = HUNK_HEADER_RE.exec(line);
    if (!m) continue;
    const start = Number.parseInt(m[1], 10);
    const count = m[2] === undefined ? 1 : Number.parseInt(m[2], 10);
    if (!Number.isFinite(start) || start <= 0) continue;
    if (count <= 0) {
      // Pure-deletion hunk: nothing on the new side, skip.
      continue;
    }
    ranges.push({ startLine: start, endLine: start + count - 1 });
  }
  return ranges;
}

function diffFilesToChanges(files: GithubDiffFile[]): FileChange[] {
  const out: FileChange[] = [];
  for (const f of files) {
    if (!f.filename) continue;
    if (f.status === "removed") continue; // nothing on new side
    const ranges = parsePatchRanges(f.patch);
    for (const r of ranges) {
      out.push({ file: f.filename, startLine: r.startLine, endLine: r.endLine });
    }
  }
  return out;
}

// ── HTTP helpers ─────────────────────────────────────────────────────────

async function ghGet<T>(
  fetchImpl: typeof fetch,
  pat: string,
  url: string,
): Promise<T> {
  const res = await fetchImpl(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "lc4-dev-builder-drift-check",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub GET ${url} → ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ── Public factory ───────────────────────────────────────────────────────

/**
 * Returns a `fetchOthers` callback suitable for passing to
 * `runPreMergeDriftCheck` (and therefore to `runDevBuilderMerge`).
 *
 * Failure modes are propagated as thrown errors — the caller (the
 * builder) is responsible for catching and treating them as a hard
 * abort. Never returns a partially-populated comparison set; doing so
 * would silently weaken the merge gate.
 */
export function createGithubFetchOthers(
  opts: GithubFetchOthersOptions,
): (currentBranch: string) => Promise<BranchChanges[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const defaultBranch = opts.defaultBranch ?? "main";
  const perPage = opts.perPage ?? 30;

  return async function fetchOthers(currentBranch: string): Promise<BranchChanges[]> {
    const out: BranchChanges[] = [];

    // 1. Open PRs (excluding ours).
    const pulls = await ghGet<GithubPullSummary[]>(
      fetchImpl,
      opts.pat,
      `${GITHUB_API}/repos/${opts.repo}/pulls?state=open&per_page=${perPage}`,
    );
    for (const pr of pulls) {
      if (!pr || pr.state !== "open") continue;
      if (pr.head?.ref === currentBranch) continue;
      // Only compare against PRs that target the same merge base. A PR
      // pointing at, say, a long-lived feature branch would otherwise
      // generate spurious "drift" against our default-branch merge.
      if (pr.base?.ref !== defaultBranch) continue;
      const files = await ghGet<GithubDiffFile[]>(
        fetchImpl,
        opts.pat,
        `${GITHUB_API}/repos/${opts.repo}/pulls/${pr.number}/files?per_page=${perPage}`,
      );
      const changes = diffFilesToChanges(files);
      if (changes.length === 0) continue;
      out.push({ ref: `pr#${pr.number}@${pr.head.ref}`, changes });
    }

    // 2. Commits merged to the default branch since the branch was cut.
    const commits = await ghGet<GithubCommitSummary[]>(
      fetchImpl,
      opts.pat,
      `${GITHUB_API}/repos/${opts.repo}/commits?sha=${encodeURIComponent(
        defaultBranch,
      )}&since=${encodeURIComponent(opts.branchCutAt)}&per_page=${perPage}`,
    );
    for (const c of commits) {
      if (!c?.sha) continue;
      const detail = await ghGet<{ files?: GithubDiffFile[] }>(
        fetchImpl,
        opts.pat,
        `${GITHUB_API}/repos/${opts.repo}/commits/${c.sha}`,
      );
      const changes = diffFilesToChanges(detail.files ?? []);
      if (changes.length === 0) continue;
      out.push({ ref: `${defaultBranch}@${c.sha}`, changes });
    }

    return out;
  };
}
