/**
 * LC4 — Dev Builder · real GitHub PR opener (task #878).
 *
 * Production-ready helper that takes the aggregated file state produced
 * by a successful builder run and:
 *
 *   1. Resolves the base branch's tip commit + tree SHA.
 *   2. Creates one Git Blob per modified file (utf-8 only — binary files
 *      are out of scope for the LC1 sandbox).
 *   3. Creates a new Git Tree based on the base tree, overlaying the new
 *      blobs + tombstoning deleted files.
 *   4. Creates a new Git Commit pointing at that tree, with the base
 *      commit as parent.
 *   5. Creates / updates the head branch ref to that commit.
 *   6. Opens (or returns the existing) PR from `head` to `base`.
 *
 * `fetchImpl` is injected so the integration test can drive the full
 * flow without ever talking to GitHub. Every non-2xx response throws
 * with the response body — there is no silent partial-result path.
 */

const GITHUB_API = "https://api.github.com";

export interface OpenPrFileChange {
  /** POSIX-style relative path from the repo root. */
  readonly path: string;
  /** New file contents. `null` means the file is deleted. */
  readonly content: string | null;
}

export interface OpenPrOptions {
  readonly pat: string;
  readonly repo: string;
  readonly baseBranch: string;
  readonly headBranch: string;
  readonly title: string;
  readonly body: string;
  readonly authorName: string;
  readonly authorEmail: string;
  readonly commitMessage: string;
  readonly files: readonly OpenPrFileChange[];
  readonly fetchImpl?: typeof fetch;
}

export interface OpenPrResult {
  readonly number: number;
  readonly url: string;
  readonly headSha: string;
  readonly alreadyOpen: boolean;
}

interface GhRefResponse {
  object: { sha: string; type: string };
}
interface GhCommitResponse {
  sha: string;
  tree: { sha: string };
}
interface GhBlobResponse {
  sha: string;
}
interface GhTreeResponse {
  sha: string;
}
interface GhPullResponse {
  number: number;
  html_url: string;
  head: { sha: string };
}

async function ghJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  pat: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${pat}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const merged: RequestInit = {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string>) },
  };
  const res = await fetchImpl(url, merged);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `github_api_error: ${init.method ?? "GET"} ${url} → ${res.status} ${text}`,
    );
  }
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

/** Open a PR from an aggregated file state.
 *
 *  Branch creation strategy: best-effort. If the head branch already
 *  exists it is fast-forwarded to the new commit (force=false → falls
 *  back to a non-fast-forward update that GitHub allows on dev branches
 *  via `force=true`). If a PR is already open from this head, return it. */
export async function openGithubPullRequest(
  opts: OpenPrOptions,
): Promise<OpenPrResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const repo = opts.repo;
  const enc = (s: string) => encodeURIComponent(s);

  // 1. Resolve base ref → commit → tree.
  const baseRef = await ghJson<GhRefResponse>(
    fetchImpl,
    `${GITHUB_API}/repos/${repo}/git/refs/heads/${enc(opts.baseBranch)}`,
    opts.pat,
  );
  const baseCommit = await ghJson<GhCommitResponse>(
    fetchImpl,
    `${GITHUB_API}/repos/${repo}/git/commits/${baseRef.object.sha}`,
    opts.pat,
  );

  // 2. Create one blob per non-deleted file.
  const treeEntries: Array<
    | { path: string; mode: "100644"; type: "blob"; sha: string }
    | { path: string; mode: "100644"; type: "blob"; sha: null }
  > = [];
  for (const f of opts.files) {
    if (f.content === null) {
      // Tombstone for deletion.
      treeEntries.push({ path: f.path, mode: "100644", type: "blob", sha: null });
      continue;
    }
    const blob = await ghJson<GhBlobResponse>(
      fetchImpl,
      `${GITHUB_API}/repos/${repo}/git/blobs`,
      opts.pat,
      {
        method: "POST",
        body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
      },
    );
    treeEntries.push({
      path: f.path,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  // 3. New tree based on the base tree.
  const tree = await ghJson<GhTreeResponse>(
    fetchImpl,
    `${GITHUB_API}/repos/${repo}/git/trees`,
    opts.pat,
    {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseCommit.tree.sha,
        tree: treeEntries,
      }),
    },
  );

  // 4. New commit on top of base.
  const commit = await ghJson<GhCommitResponse>(
    fetchImpl,
    `${GITHUB_API}/repos/${repo}/git/commits`,
    opts.pat,
    {
      method: "POST",
      body: JSON.stringify({
        message: opts.commitMessage,
        tree: tree.sha,
        parents: [baseRef.object.sha],
        author: {
          name: opts.authorName,
          email: opts.authorEmail,
          date: new Date().toISOString(),
        },
      }),
    },
  );

  // 5. Create or update the head ref.
  const headRefUrl =
    `${GITHUB_API}/repos/${repo}/git/refs/heads/${enc(opts.headBranch)}`;
  let headExists = true;
  try {
    await ghJson<GhRefResponse>(fetchImpl, headRefUrl, opts.pat);
  } catch (err) {
    if (err instanceof Error && /→ 404/.test(err.message)) {
      headExists = false;
    } else {
      throw err;
    }
  }
  if (headExists) {
    await ghJson(fetchImpl, headRefUrl, opts.pat, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: true }),
    });
  } else {
    await ghJson(fetchImpl, `${GITHUB_API}/repos/${repo}/git/refs`, opts.pat, {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${opts.headBranch}`,
        sha: commit.sha,
      }),
    });
  }

  // 6. Find or create a PR.
  const owner = repo.split("/")[0];
  const existing = await ghJson<GhPullResponse[]>(
    fetchImpl,
    `${GITHUB_API}/repos/${repo}/pulls?state=open&head=${enc(owner)}:${
      enc(opts.headBranch)
    }`,
    opts.pat,
  );
  if (Array.isArray(existing) && existing.length > 0) {
    const pr = existing[0];
    return {
      number: pr.number,
      url: pr.html_url,
      headSha: commit.sha,
      alreadyOpen: true,
    };
  }
  const pr = await ghJson<GhPullResponse>(
    fetchImpl,
    `${GITHUB_API}/repos/${repo}/pulls`,
    opts.pat,
    {
      method: "POST",
      body: JSON.stringify({
        title: opts.title,
        body: opts.body,
        head: opts.headBranch,
        base: opts.baseBranch,
      }),
    },
  );
  return {
    number: pr.number,
    url: pr.html_url,
    headSha: commit.sha,
    alreadyOpen: false,
  };
}
