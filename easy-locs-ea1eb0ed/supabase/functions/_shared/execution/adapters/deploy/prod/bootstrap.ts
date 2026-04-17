/**
 * Deploy production adapter bootstrap — LC2 (task #872).
 *
 * Defaults the runner to a real Vercel REST runner. The adapter itself
 * still refuses to call the runner unless `task.approved_by` is set
 * (defense-in-depth on top of the orchestrator's authorization gate
 * and the `dev-sensitive` policy profile).
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { globalAdapterRegistry } from "../../../adapter-registry.ts";
import { globalVerifierRegistry } from "../../../verifier-registry.ts";
import { reconcileAgents, type ReconcileResult } from "../../../agent-reconciler.ts";
import {
  createDeployProdAdapter,
  type DeployProdAdapterDeps,
  type DeployProdRunner,
} from "./deploy-prod-adapter.ts";
import { createDeployProdVerifier } from "./deploy-prod-verifier.ts";
import { createVercelProdRunner } from "../vercel-runner.ts";

export interface DeployProdBootstrapOverrides extends DeployProdAdapterDeps {
  reconcileAgents?: boolean;
  reconcile?: (sb: SupabaseClient) => Promise<ReconcileResult>;
}

function bootEnv(): string {
  try {
    // deno-lint-ignore no-explicit-any
    const denoEnv = (globalThis as any)?.Deno?.env?.get?.bind((globalThis as any).Deno.env);
    return (
      (denoEnv && (denoEnv("SUPABASE_FUNCTION_ENV") || denoEnv("DENO_ENV") || denoEnv("NODE_ENV"))) ||
      // deno-lint-ignore no-explicit-any
      (globalThis as any)?.process?.env?.NODE_ENV ||
      "development"
    );
  } catch {
    return "development";
  }
}

export async function bootstrapDeployProdAdapters(
  sb: SupabaseClient,
  overrides: DeployProdBootstrapOverrides = {},
): Promise<void> {
  const keyEnv = overrides.keyEnv ?? "VERCEL_ACCESS_TOKEN";
  const runner: DeployProdRunner = overrides.runner ?? createVercelProdRunner(keyEnv);
  globalVerifierRegistry.register(createDeployProdVerifier(), { overwrite: true });
  globalAdapterRegistry.register(
    createDeployProdAdapter({
      runner,
      defaultTeam: overrides.defaultTeam,
      keyEnv,
    }),
    { overwrite: true },
  );

  if (overrides.reconcileAgents === false) return;

  const env = bootEnv();
  const reconcile = overrides.reconcile ?? reconcileAgents;
  let result: ReconcileResult;
  try {
    result = await reconcile(sb);
  } catch (e) {
    const msg = `[deploy.prod.bootstrap] reconcileAgents threw: ${
      e instanceof Error ? e.message : String(e)
    }`;
    if (env === "production") throw e instanceof Error ? e : new Error(msg);
    console.warn(msg);
    return;
  }
  if (!result.ok) {
    const detail = result.failed.map((f) => `${f.slug}: ${f.error}`).join("; ");
    const msg = `[deploy.prod.bootstrap] reconcileAgents reported failures: ${detail}`;
    if (env === "production") throw new Error(msg);
    console.warn(msg);
  }
}

export {
  DEPLOY_DOMAIN,
  DEPLOY_ERROR_CODES,
  DEPLOY_EVENTS,
  DEPLOY_TASK_TYPES,
} from "../types.ts";
