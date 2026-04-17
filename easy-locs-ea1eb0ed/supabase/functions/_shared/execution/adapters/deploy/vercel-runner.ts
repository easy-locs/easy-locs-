/**
 * Default Vercel deploy runner (LC2, task #872).
 *
 * Posts to the Vercel `v13/deployments` REST endpoint to trigger a
 * preview or production deploy, then returns the dispatched deployment
 * id + URL + status. Token is read from the env var named in the agent
 * metadata's `router.primary.key_env` (default: `VERCEL_ACCESS_TOKEN`)
 * — never accepted from the payload.
 *
 * The runner is intentionally thin: it dispatches and returns the
 * initial Vercel response. A separate poller (LC4 driver) waits for
 * `READY` if the workflow needs that signal.
 */

import type { DeployRunner } from "./preview/deploy-preview-adapter.ts";
import type { DeployProdRunner } from "./prod/deploy-prod-adapter.ts";

interface VercelDeployResponse {
  id?: string;
  uid?: string;
  url?: string;
  readyState?: string;
  status?: string;
}

function readToken(keyEnv: string): string {
  // deno-lint-ignore no-explicit-any
  const denoEnv = (globalThis as any)?.Deno?.env?.get?.bind((globalThis as any).Deno.env);
  const value = denoEnv ? denoEnv(keyEnv) : undefined;
  if (!value || typeof value !== "string") {
    throw new Error(
      `vercel runner: env var ${keyEnv} is not set; refusing to dispatch`,
    );
  }
  return value;
}

async function dispatch(args: {
  target: "preview" | "production";
  project: string;
  gitRef: string | null;
  team: string | null;
  label: string | null;
  keyEnv: string;
}): Promise<{
  deploymentId: string;
  url: string;
  status: string;
  durationMs: number;
  buildMinutes: number;
}> {
  const token = readToken(args.keyEnv);
  const startedAt = Date.now();

  const teamQs = args.team ? `?teamId=${encodeURIComponent(args.team)}` : "";
  const url = `https://api.vercel.com/v13/deployments${teamQs}`;
  const body = {
    name: args.project,
    target: args.target,
    project: args.project,
    gitSource: args.gitRef
      ? { type: "github", ref: args.gitRef }
      : undefined,
    meta: args.label ? { label: args.label } : undefined,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as VercelDeployResponse;
  const durationMs = Date.now() - startedAt;
  const buildMinutes = Math.round((durationMs / 60_000) * 10_000) / 10_000;

  if (!res.ok) {
    throw new Error(
      `vercel ${args.target} deploy failed: HTTP ${res.status} ` +
        `${JSON.stringify(json).slice(0, 256)}`,
    );
  }

  const deploymentId = json.id ?? json.uid ?? "";
  const deployUrl = json.url ? `https://${json.url}` : "";
  const status = json.readyState ?? json.status ?? "QUEUED";
  return { deploymentId, url: deployUrl, status, durationMs, buildMinutes };
}

export function createVercelPreviewRunner(keyEnv = "VERCEL_ACCESS_TOKEN"): DeployRunner {
  return async ({ project, gitRef, team, label }) => {
    return await dispatch({
      target: "preview",
      project, gitRef, team, label, keyEnv,
    });
  };
}

export function createVercelProdRunner(keyEnv = "VERCEL_ACCESS_TOKEN"): DeployProdRunner {
  return async ({ project, gitRef, team, label }) => {
    return await dispatch({
      target: "production",
      project, gitRef, team, label, keyEnv,
    });
  };
}
