/**
 * LC6 (#877) — Concrete `GithubRevertClient` implementation backed by
 * the GitHub REST API. Used by the production execution-loop to drive
 * the `revert_pr` rollback strategy.
 *
 * Deliberately minimal: only the three methods the `revert_pr`
 * orchestration needs are implemented (getCommit, listRecentCommits,
 * createRevertCommit). Uses the low-level git-data endpoints to push
 * a revert commit directly to `branch` so the rollback succeeds even
 * when the branch is protected against force-push but allows normal
 * fast-forward pushes from the PAT's bot identity.
 *
 * Credentials come from the existing runner secrets:
 *   - `GITHUB_RUNNER_PAT`  — personal access token (same as #816)
 *   - `GITHUB_RUNNER_REPO` — `owner/repo` slug
 *   - `GITHUB_RUNNER_REF`  — production branch (default: `main`)
 *
 * `createGithubRevertClientFromEnv()` returns `null` when any required
 * secret is missing so the execution-loop can boot without LC6 active
 * (falling back to the LC2 default `rollback_strategy="none"`).
 */

import type { GithubRevertClient } from "./revert-pr.ts";

const GITHUB_API_BASE = "https://api.github.com";

interface GhCommitResponse {
  sha: string;
  commit?: { message?: string };
  parents?: Array<{ sha: string }>;
}

function authHeaders(pat: string): Record<string, string> {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "lc6-revert-pr/1.0",
  };
}

async function ghFetch(
  pat: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(pat),
      ...(init.headers ?? {}),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

export interface GithubRevertClientOptions {
  pat: string;
  /** Optional override for the fetch implementation (testing). */
  fetchImpl?: typeof fetch;
}

/**
 * Real GithubRevertClient backed by fetch + GitHub REST.
 *
 * createRevertCommit implementation strategy (per-file revert, safe for
 * non-HEAD commits and merge commits):
 *
 *   1. Fetch the HEAD commit of `branch` (target parent of the new
 *      revert commit) and its tree SHA.
 *   2. Fetch the target commit with `files[]` (status + path +
 *      `previous_filename` for renames).
 *   3. Pick the "mainline" parent of the target: for single-parent
 *      commits it's parents[0]; for merge commits we use parents[0] as
 *      `mainline=1` per `git revert -m 1` convention.
 *   4. Recursively fetch the mainline parent's tree once and build a
 *      path → blob-SHA map.
 *   5. For each file the target touched, compute the tree entry that
 *      restores its pre-commit state on top of HEAD:
 *         - added   → delete (sha=null)
 *         - removed → restore blob from parent tree
 *         - modified→ restore blob from parent tree
 *         - renamed → delete new path, restore old path's blob
 *      All other files in HEAD are left untouched (base_tree=HEAD_tree).
 *   6. POST `/git/trees` with base_tree=HEAD_tree + the computed
 *      entries → new tree SHA.
 *   7. POST `/git/commits` with tree=new_tree, parents=[branchHead] →
 *      new commit SHA.
 *   8. PATCH the branch ref to fast-forward to the new commit.
 *
 * This preserves every commit AFTER the target on HEAD, unlike a naive
 * tree-reset approach. It works for non-HEAD commits (other later
 * changes survive) and merge commits (mainline parent used).
 */
export function createGithubRevertClient(
  opts: GithubRevertClientOptions,
): GithubRevertClient {
  const { pat } = opts;
  const doFetch = opts.fetchImpl ?? ((path: string, init?: RequestInit) =>
    ghFetch(pat, path, init ?? {}));

  return {
    async getCommit({ repo, sha }) {
      const res = await doFetch(`/repos/${repo}/commits/${sha}`);
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(
          `github.getCommit ${repo}@${sha}: ${res.status} ${await res.text()}`,
        );
      }
      const body = (await res.json()) as GhCommitResponse;
      return {
        sha: body.sha,
        message: body.commit?.message ?? "",
        parents: (body.parents ?? []).map((p) => p.sha),
      };
    },

    async listRecentCommits({ repo, branch, limit }) {
      const per = Math.min(Math.max(1, limit), 100);
      const res = await doFetch(
        `/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${per}`,
      );
      if (!res.ok) {
        throw new Error(
          `github.listRecentCommits ${repo}@${branch}: ${res.status} ${await res.text()}`,
        );
      }
      const body = (await res.json()) as Array<GhCommitResponse>;
      return body.map((c) => ({ sha: c.sha, message: c.commit?.message ?? "" }));
    },

    async createRevertCommit({ repo, branch, commitSha, message }) {
      // 1) HEAD of branch + HEAD tree sha.
      const refRes = await doFetch(
        `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
      );
      if (!refRes.ok) {
        throw new Error(
          `github.createRevertCommit ref-read ${repo}@${branch}: ${refRes.status} ${await refRes.text()}`,
        );
      }
      const ref = await refRes.json() as { object: { sha: string } };
      const branchHead = ref.object.sha;
      const headCommitRes = await doFetch(
        `/repos/${repo}/git/commits/${branchHead}`,
      );
      if (!headCommitRes.ok) {
        throw new Error(
          `github.createRevertCommit head-commit-read ${repo}@${branchHead}: ${headCommitRes.status} ${await headCommitRes.text()}`,
        );
      }
      const headCommit = await headCommitRes.json() as {
        tree: { sha: string };
      };
      const headTreeSha = headCommit.tree.sha;

      // 2) Target commit with file list.
      const targetRes = await doFetch(`/repos/${repo}/commits/${commitSha}`);
      if (!targetRes.ok) {
        throw new Error(
          `github.createRevertCommit target-read ${repo}@${commitSha}: ${targetRes.status} ${await targetRes.text()}`,
        );
      }
      const target = await targetRes.json() as {
        parents?: Array<{ sha: string }>;
        files?: Array<{
          filename: string;
          status: string; // added | removed | modified | renamed | copied | changed
          previous_filename?: string;
          sha?: string; // post-commit blob (unused here)
        }>;
      };
      const parents = target.parents ?? [];
      if (parents.length === 0) {
        throw new Error(
          `github.createRevertCommit: commit ${commitSha} has no parents (root commit cannot be reverted)`,
        );
      }
      // 3) Mainline parent (parents[0]) — same as `git revert -m 1` for
      //    merge commits and the only parent for regular commits.
      const parentSha = parents[0].sha;

      // 4) Fetch the mainline parent's tree recursively to build a
      //    path → blob-sha lookup for every file the target commit
      //    touched.
      const parentCommitRes = await doFetch(
        `/repos/${repo}/git/commits/${parentSha}`,
      );
      if (!parentCommitRes.ok) {
        throw new Error(
          `github.createRevertCommit parent-read ${repo}@${parentSha}: ${parentCommitRes.status} ${await parentCommitRes.text()}`,
        );
      }
      const parentCommit = await parentCommitRes.json() as {
        tree: { sha: string };
      };
      const parentTreeSha = parentCommit.tree.sha;
      const parentTreeRes = await doFetch(
        `/repos/${repo}/git/trees/${parentTreeSha}?recursive=1`,
      );
      if (!parentTreeRes.ok) {
        throw new Error(
          `github.createRevertCommit parent-tree-read ${repo}@${parentTreeSha}: ${parentTreeRes.status} ${await parentTreeRes.text()}`,
        );
      }
      const parentTree = await parentTreeRes.json() as {
        truncated?: boolean;
        tree: Array<{
          path: string;
          mode: string;
          type: string;
          sha: string;
        }>;
      };
      if (parentTree.truncated) {
        throw new Error(
          `github.createRevertCommit: parent tree ${parentTreeSha} is truncated; ` +
            "cannot safely revert commits in repositories exceeding the GitHub API limit",
        );
      }
      const parentByPath = new Map<string, { mode: string; type: string; sha: string }>();
      for (const entry of parentTree.tree) {
        if (entry.type === "blob") {
          parentByPath.set(entry.path, { mode: entry.mode, type: entry.type, sha: entry.sha });
        }
      }

      // 5) Compute the per-file revert tree entries on top of HEAD.
      type TreeEntry = {
        path: string;
        mode: string;
        type: string;
        sha?: string | null;
      };
      const entries: TreeEntry[] = [];
      const files = target.files ?? [];
      if (files.length === 0) {
        throw new Error(
          `github.createRevertCommit: target commit ${commitSha} reports no files (empty changeset)`,
        );
      }
      for (const f of files) {
        switch (f.status) {
          case "added": {
            // Target added this file → revert by deleting it.
            entries.push({ path: f.filename, mode: "100644", type: "blob", sha: null });
            break;
          }
          case "removed":
          case "modified":
          case "changed": {
            const prior = parentByPath.get(f.filename);
            if (!prior) {
              throw new Error(
                `github.createRevertCommit: file ${f.filename} not present in parent tree ` +
                  `(status=${f.status}); refusing to revert silently`,
              );
            }
            entries.push({
              path: f.filename,
              mode: prior.mode,
              type: prior.type,
              sha: prior.sha,
            });
            break;
          }
          case "renamed":
          case "copied": {
            // Delete the new path; restore the old path's blob from parent.
            entries.push({ path: f.filename, mode: "100644", type: "blob", sha: null });
            const oldPath = f.previous_filename;
            if (!oldPath) {
              throw new Error(
                `github.createRevertCommit: ${f.status} file ${f.filename} missing previous_filename`,
              );
            }
            const prior = parentByPath.get(oldPath);
            if (!prior) {
              throw new Error(
                `github.createRevertCommit: renamed-from path ${oldPath} not present in parent tree`,
              );
            }
            entries.push({
              path: oldPath,
              mode: prior.mode,
              type: prior.type,
              sha: prior.sha,
            });
            break;
          }
          default: {
            throw new Error(
              `github.createRevertCommit: unsupported file status "${f.status}" for ${f.filename}`,
            );
          }
        }
      }

      // 6) Create the new tree on top of HEAD, overlaying only the
      //    reverted paths.
      const treeRes = await doFetch(`/repos/${repo}/git/trees`, {
        method: "POST",
        body: JSON.stringify({ base_tree: headTreeSha, tree: entries }),
      });
      if (!treeRes.ok) {
        throw new Error(
          `github.createRevertCommit tree-create ${repo}: ${treeRes.status} ${await treeRes.text()}`,
        );
      }
      const newTree = await treeRes.json() as { sha: string };

      // 7) Create the revert commit with HEAD as its (sole) parent.
      const commitRes = await doFetch(`/repos/${repo}/git/commits`, {
        method: "POST",
        body: JSON.stringify({
          message,
          tree: newTree.sha,
          parents: [branchHead],
        }),
      });
      if (!commitRes.ok) {
        throw new Error(
          `github.createRevertCommit commit-create ${repo}: ${commitRes.status} ${await commitRes.text()}`,
        );
      }
      const newCommit = await commitRes.json() as { sha: string };

      // 8) Fast-forward branch ref.
      const updateRes = await doFetch(
        `/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ sha: newCommit.sha, force: false }),
        },
      );
      if (!updateRes.ok) {
        throw new Error(
          `github.createRevertCommit ref-update ${repo}@${branch}: ${updateRes.status} ${await updateRes.text()}`,
        );
      }
      return { sha: newCommit.sha };
    },
  };
}

/**
 * Env-driven factory. Returns `null` when any required secret is
 * missing so the execution-loop can boot without LC6 active. Callers
 * log a warning in that case.
 */
export function createGithubRevertClientFromEnv(env: {
  get(name: string): string | undefined;
}): { client: GithubRevertClient; repo: string; branch: string } | null {
  const pat = env.get("GITHUB_RUNNER_PAT") ?? "";
  const repo = env.get("GITHUB_RUNNER_REPO") ?? "";
  const branch = env.get("GITHUB_RUNNER_REF") ?? "main";
  if (!pat || !repo) return null;
  return {
    client: createGithubRevertClient({ pat }),
    repo,
    branch,
  };
}
