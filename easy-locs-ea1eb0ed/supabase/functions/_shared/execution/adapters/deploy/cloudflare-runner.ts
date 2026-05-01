/**
 * Cloudflare Pages deploy runner (replaces Vercel runner).
 *
 * Triggers a deployment on the Cloudflare Pages REST API
 * (`POST /accounts/{accountId}/pages/projects/{project}/deployments`).
 * Returns the dispatched deployment id, URL, and initial status so the
 * caller (bootstrap / LC4 poller) can track progress.
 *
 * Required env vars (default names):
 *   CF_API_TOKEN   — Cloudflare API token with Pages:Edit permission
 *   CF_ACCOUNT_ID  — Cloudflare account ID
 *
 * The `keyEnv` parameter controls the token env-var name; `accountEnv`
 * controls the account-id env-var name. Tests inject a stub runner so
 * this module is never called directly in unit tests.
 */

import type { DeployRunner } from "./preview/deploy-preview-adapter.ts";
import type { DeployProdRunner } from "./prod/deploy-prod-adapter.ts";

interface CfPagesDeploymentStage {
  name?: string;
  status?: string;
}

interface CfPagesDeploymentResult {
  id?: string;
  url?: string;
  aliases?: string[];
  latest_stage?: CfPagesDeploymentStage;
  deployment_trigger?: { metadata?: { commit_hash?: string; branch?: string } };
}

interface CfPagesApiResponse {
  result?: CfPagesDeploymentResult;
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
}

function readEnv(name: string): string {
  // deno-lint-ignore no-explicit-any
  const denoEnv = (globalThis as any)?.Deno?.env?.get?.bind((globalThis as any).Deno.env);
  const value = denoEnv ? denoEnv(name) : undefined;
  if (!value || typeof value !== "string") {
    throw new Error(
      `cloudflare runner: env var ${name} is not set; refusing to dispatch`,
    );
  }
  return value;
}

async function dispatch(args: {
  target: "preview" | "production";
  project: string;
  gitRef: string | null;
  keyEnv: string;
  accountEnv: string;
}): Promise<{
  deploymentId: string;
  url: string;
  status: string;
  durationMs: number;
  buildMinutes: number;
}> {
  const token = readEnv(args.keyEnv);
  const accountId = readEnv(args.accountEnv);
  const startedAt = Date.now();

  const apiUrl =
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(args.project)}/deployments`;

  // Cloudflare Pages API: optionally set a branch to deploy from.
  const body: Record<string, string> = {};
  if (args.gitRef) {
    body.branch = args.gitRef;
  }

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as CfPagesApiResponse;
  const durationMs = Date.now() - startedAt;
  const buildMinutes = Math.round((durationMs / 60_000) * 10_000) / 10_000;

  if (!res.ok || json.success === false) {
    const errs = (json.errors ?? []).map((e) => e.message).join("; ");
    throw new Error(
      `cloudflare pages ${args.target} deploy failed: HTTP ${res.status} — ${errs || JSON.stringify(json).slice(0, 256)}`,
    );
  }

  const result = json.result ?? {};
  const deploymentId = result.id ?? "";
  // CF Pages preview URL pattern: {deploymentId}.{project}.pages.dev
  const deployUrl =
    result.url ??
    (result.aliases?.[0]) ??
    (deploymentId
      ? `https://${deploymentId}.${args.project}.pages.dev`
      : "");
  const status = result.latest_stage?.status ?? "queued";

  return { deploymentId, url: deployUrl, status, durationMs, buildMinutes };
}

export function createCfPagesPreviewRunner(
  keyEnv = "CF_API_TOKEN",
  accountEnv = "CF_ACCOUNT_ID",
): DeployRunner {
  return async ({ project, gitRef }) => {
    return await dispatch({ target: "preview", project, gitRef: gitRef ?? null, keyEnv, accountEnv });
  };
}

export function createCfPagesProdRunner(
  keyEnv = "CF_API_TOKEN",
  accountEnv = "CF_ACCOUNT_ID",
): DeployProdRunner {
  return async ({ project, gitRef }) => {
    return await dispatch({ target: "production", project, gitRef: gitRef ?? null, keyEnv, accountEnv });
  };
}
