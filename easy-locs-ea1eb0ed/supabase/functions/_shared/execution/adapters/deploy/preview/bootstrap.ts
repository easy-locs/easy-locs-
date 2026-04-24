/**
 * Deploy preview adapter bootstrap — LC2 (task #872).
 *
 * Defaults the runner to a real Vercel REST runner reading the access
 * token from the env var named in `metadata.router.primary.key_env`
 * (default `VERCEL_ACCESS_TOKEN`). Tests inject a stub.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { globalAdapterRegistry } from "../../../adapter-registry.ts";
import { globalVerifierRegistry } from "../../../verifier-registry.ts";
import { reconcileAgents, type ReconcileResult } from "../../../agent-reconciler.ts";
import {
  createDeployPreviewAdapter,
  type DeployPreviewAdapterDeps,
  type DeployRunner,
} from "./deploy-preview-adapter.ts";
import { createDeployPreviewVerifier } from "./deploy-preview-verifier.ts";
import { createVercelPreviewRunner } from "../vercel-runner.ts";

export interface DeployPreviewBootstrapOverrides extends DeployPreviewAdapterDeps {
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

export async function bootstrapDeployPreviewAdapters(
  sb: SupabaseClient,
  overrides: DeployPreviewBootstrapOverrides = {},
): Promise<void> {
  const keyEnv = overrides.keyEnv ?? "VERCEL_ACCESS_TOKEN";
  const runner: DeployRunner = overrides.runner ?? createVercelPreviewRunner(keyEnv);
  globalVerifierRegistry.register(createDeployPreviewVerifier(), { overwrite: true });
  globalAdapterRegistry.register(
    createDeployPreviewAdapter({
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
    const msg = `[deploy.preview.bootstrap] reconcileAgents threw: ${
      e instanceof Error ? e.message : String(e)
    }`;
    if (env === "production") throw e instanceof Error ? e : new Error(msg);
    console.warn(msg);
    return;
  }
  if (!result.ok) {
    const detail = result.failed.map((f) => `${f.slug}: ${f.error}`).join("; ");
    const msg = `[deploy.preview.bootstrap] reconcileAgents reported failures: ${detail}`;
    if (env === "production") throw new Error(msg);
    console.warn(msg);
  }
}
