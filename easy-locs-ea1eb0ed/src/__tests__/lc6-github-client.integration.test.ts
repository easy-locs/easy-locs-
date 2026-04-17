/**
 * LC6 — GitHub revert client correctness tests (task #877).
 *
 * Pins the per-file revert semantics so rollback cannot silently
 * truncate a branch or fail to support merge commits:
 *
 *   1. Reverting a NON-HEAD commit (commits made AFTER the target)
 *      must preserve the later changes. The revert commit's tree
 *      restores only the target's files to their pre-commit blobs.
 *
 *   2. Reverting a MERGE commit must use the mainline parent
 *      (parents[0]) per `git revert -m 1` convention.
 *
 *   3. Reverting an ADDED file deletes it; reverting a RENAME restores
 *      the old path and deletes the new one.
 *
 * The GitHub REST API is stubbed via an in-memory fetch that mirrors
 * the endpoints the client calls. No network, no real git.
 */

import { describe, expect, it } from "vitest";
import { createGithubRevertClient } from "../../supabase/functions/_shared/execution/rollback/github-client.ts";

type RouteHandler = (body: unknown, url: URL) => { status: number; json: unknown };

/** Minimal in-memory GitHub REST stub with recording. */
function makeGithubStub(routes: Record<string, RouteHandler>) {
  const calls: Array<{ method: string; path: string; body: unknown }> = [];
  const fetchImpl: typeof fetch = (async (
    input: URL | RequestInfo,
    init?: RequestInit,
  ) => {
    const path = typeof input === "string" ? input : (input as Request).url ?? String(input);
    const url = new URL(`https://api.github.com${path.startsWith("http") ? new URL(path).pathname + new URL(path).search : path}`);
    const method = (init?.method ?? "GET").toUpperCase();
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, path: url.pathname + url.search, body });
    const key = `${method} ${url.pathname}`;
    const handler = routes[key];
    if (!handler) throw new Error(`unrouted: ${key}`);
    const out = handler(body, url);
    return new Response(JSON.stringify(out.json), {
      status: out.status,
      headers: { "Content-Type": "application/json" },
    });
    // deno-lint-ignore no-explicit-any
  }) as any;
  return { fetchImpl, calls };
}

describe("GithubRevertClient.createRevertCommit — correctness", () => {
  it("revert of a NON-HEAD commit preserves later changes (per-file revert on top of HEAD)", async () => {
    // Scenario:
    //   parent-commit (P) → tree has a.txt=blobA1, b.txt=blobB1
    //   target-commit (T) → modifies a.txt to blobA2, leaves b.txt
    //   later-commit  (L) → modifies b.txt to blobB2 (HEAD)
    // Reverting T must restore a.txt to blobA1 ON TOP OF HEAD,
    // WITHOUT touching b.txt (which is at blobB2).
    const capturedTreePost: { base_tree?: string; tree?: unknown[] }[] = [];
    const { fetchImpl } = makeGithubStub({
      "GET /repos/acme/demo/git/ref/heads/main": () => ({
        status: 200,
        json: { object: { sha: "headSha" } },
      }),
      "GET /repos/acme/demo/git/commits/headSha": () => ({
        status: 200,
        json: { tree: { sha: "headTreeSha" } },
      }),
      "GET /repos/acme/demo/commits/targetSha": () => ({
        status: 200,
        json: {
          parents: [{ sha: "parentSha" }],
          files: [{ filename: "a.txt", status: "modified" }],
        },
      }),
      "GET /repos/acme/demo/git/commits/parentSha": () => ({
        status: 200,
        json: { tree: { sha: "parentTreeSha" } },
      }),
      "GET /repos/acme/demo/git/trees/parentTreeSha": () => ({
        status: 200,
        json: {
          truncated: false,
          tree: [
            { path: "a.txt", mode: "100644", type: "blob", sha: "blobA1" },
            { path: "b.txt", mode: "100644", type: "blob", sha: "blobB1" },
          ],
        },
      }),
      "POST /repos/acme/demo/git/trees": (body) => {
        capturedTreePost.push(body as { base_tree: string; tree: unknown[] });
        return { status: 201, json: { sha: "newTreeSha" } };
      },
      "POST /repos/acme/demo/git/commits": () => ({
        status: 201,
        json: { sha: "revertCommitSha" },
      }),
      "PATCH /repos/acme/demo/git/refs/heads/main": () => ({
        status: 200,
        json: { object: { sha: "revertCommitSha" } },
      }),
    });

    const client = createGithubRevertClient({ pat: "x", fetchImpl });
    const out = await client.createRevertCommit({
      repo: "acme/demo",
      branch: "main",
      commitSha: "targetSha",
      message: "Revert targetSha",
    });
    expect(out.sha).toBe("revertCommitSha");

    // The new tree is built on top of HEAD (not parent) — preserving
    // unrelated later commits (b.txt at blobB2, untouched).
    expect(capturedTreePost).toHaveLength(1);
    const treePost = capturedTreePost[0];
    expect(treePost.base_tree).toBe("headTreeSha");
    // Only a.txt is in the overlay, restored to its parent (pre-target) blob.
    expect(treePost.tree).toEqual([
      { path: "a.txt", mode: "100644", type: "blob", sha: "blobA1" },
    ]);
  });

  it("revert of a MERGE commit uses parents[0] as mainline (git revert -m 1 convention)", async () => {
    // target has TWO parents: mainline=parentMain, side=parentSide.
    // The client must pick parentMain.
    let parentCommitsRequested: string[] = [];
    const { fetchImpl } = makeGithubStub({
      "GET /repos/acme/demo/git/ref/heads/main": () => ({
        status: 200,
        json: { object: { sha: "headSha" } },
      }),
      "GET /repos/acme/demo/git/commits/headSha": () => ({
        status: 200,
        json: { tree: { sha: "headTreeSha" } },
      }),
      "GET /repos/acme/demo/commits/mergeSha": () => ({
        status: 200,
        json: {
          parents: [{ sha: "parentMain" }, { sha: "parentSide" }],
          files: [{ filename: "x.txt", status: "modified" }],
        },
      }),
      "GET /repos/acme/demo/git/commits/parentMain": () => {
        parentCommitsRequested.push("parentMain");
        return { status: 200, json: { tree: { sha: "mainTreeSha" } } };
      },
      "GET /repos/acme/demo/git/commits/parentSide": () => {
        parentCommitsRequested.push("parentSide");
        return { status: 200, json: { tree: { sha: "sideTreeSha" } } };
      },
      "GET /repos/acme/demo/git/trees/mainTreeSha": () => ({
        status: 200,
        json: {
          truncated: false,
          tree: [{ path: "x.txt", mode: "100644", type: "blob", sha: "xMainBlob" }],
        },
      }),
      "POST /repos/acme/demo/git/trees": () => ({
        status: 201,
        json: { sha: "newTreeSha" },
      }),
      "POST /repos/acme/demo/git/commits": () => ({
        status: 201,
        json: { sha: "revertCommitSha" },
      }),
      "PATCH /repos/acme/demo/git/refs/heads/main": () => ({
        status: 200,
        json: { object: { sha: "revertCommitSha" } },
      }),
    });

    const client = createGithubRevertClient({ pat: "x", fetchImpl });
    const out = await client.createRevertCommit({
      repo: "acme/demo",
      branch: "main",
      commitSha: "mergeSha",
      message: "Revert mergeSha (merge)",
    });
    expect(out.sha).toBe("revertCommitSha");
    // ONLY mainline parent was fetched for the revert tree.
    expect(parentCommitsRequested).toContain("parentMain");
    expect(parentCommitsRequested).not.toContain("parentSide");
  });

  it("added files are DELETED in the revert overlay; renames restore old path + delete new", async () => {
    const capturedTreePost: Array<{ base_tree?: string; tree?: unknown[] }> = [];
    const { fetchImpl } = makeGithubStub({
      "GET /repos/acme/demo/git/ref/heads/main": () => ({
        status: 200,
        json: { object: { sha: "headSha" } },
      }),
      "GET /repos/acme/demo/git/commits/headSha": () => ({
        status: 200,
        json: { tree: { sha: "headTreeSha" } },
      }),
      "GET /repos/acme/demo/commits/targetSha": () => ({
        status: 200,
        json: {
          parents: [{ sha: "parentSha" }],
          files: [
            { filename: "brand-new.txt", status: "added" },
            { filename: "new-name.txt", status: "renamed", previous_filename: "old-name.txt" },
          ],
        },
      }),
      "GET /repos/acme/demo/git/commits/parentSha": () => ({
        status: 200,
        json: { tree: { sha: "parentTreeSha" } },
      }),
      "GET /repos/acme/demo/git/trees/parentTreeSha": () => ({
        status: 200,
        json: {
          truncated: false,
          tree: [
            { path: "old-name.txt", mode: "100644", type: "blob", sha: "oldBlob" },
          ],
        },
      }),
      "POST /repos/acme/demo/git/trees": (body) => {
        capturedTreePost.push(body as { base_tree: string; tree: unknown[] });
        return { status: 201, json: { sha: "newTreeSha" } };
      },
      "POST /repos/acme/demo/git/commits": () => ({
        status: 201,
        json: { sha: "revertCommitSha" },
      }),
      "PATCH /repos/acme/demo/git/refs/heads/main": () => ({
        status: 200,
        json: { object: { sha: "revertCommitSha" } },
      }),
    });

    const client = createGithubRevertClient({ pat: "x", fetchImpl });
    await client.createRevertCommit({
      repo: "acme/demo",
      branch: "main",
      commitSha: "targetSha",
      message: "Revert targetSha",
    });
    expect(capturedTreePost).toHaveLength(1);
    const tree = capturedTreePost[0].tree as Array<Record<string, unknown>>;
    // brand-new.txt is deleted (sha=null).
    const brandNew = tree.find((e) => e.path === "brand-new.txt");
    expect(brandNew).toBeTruthy();
    expect(brandNew!.sha).toBeNull();
    // new-name.txt is deleted, old-name.txt is restored to the parent blob.
    const newName = tree.find((e) => e.path === "new-name.txt");
    expect(newName).toBeTruthy();
    expect(newName!.sha).toBeNull();
    const oldName = tree.find((e) => e.path === "old-name.txt");
    expect(oldName).toBeTruthy();
    expect(oldName!.sha).toBe("oldBlob");
  });

  it("refuses to revert when the parent tree is truncated (correctness over silent partial revert)", async () => {
    const { fetchImpl } = makeGithubStub({
      "GET /repos/acme/demo/git/ref/heads/main": () => ({
        status: 200,
        json: { object: { sha: "headSha" } },
      }),
      "GET /repos/acme/demo/git/commits/headSha": () => ({
        status: 200,
        json: { tree: { sha: "headTreeSha" } },
      }),
      "GET /repos/acme/demo/commits/t": () => ({
        status: 200,
        json: {
          parents: [{ sha: "p" }],
          files: [{ filename: "a.txt", status: "modified" }],
        },
      }),
      "GET /repos/acme/demo/git/commits/p": () => ({
        status: 200,
        json: { tree: { sha: "pTree" } },
      }),
      "GET /repos/acme/demo/git/trees/pTree": () => ({
        status: 200,
        json: { truncated: true, tree: [] },
      }),
    });
    const client = createGithubRevertClient({ pat: "x", fetchImpl });
    await expect(() =>
      client.createRevertCommit({
        repo: "acme/demo",
        branch: "main",
        commitSha: "t",
        message: "r",
      })
    ).rejects.toThrow(/truncated/);
  });
});
