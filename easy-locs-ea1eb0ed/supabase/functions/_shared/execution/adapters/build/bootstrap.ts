/**
 * Build adapter bootstrap — LC2 (task #872).
 *
 * Registers the BuildAdapter and verifier on the global registries,
 * defaulting the runner to a real `Deno.Command`-backed Vite runner.
 * Tests pass `overrides.runner` to inject a deterministic stub.
 *
 * Mirrors the marketplace bootstrap shape so execution-loop can wire it
 * the same way (await reconcile against `system.agents`; hard-fail in
 * production, log-and-continue in dev/preview).
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { globalAdapterRegistry } from "../../adapter-registry.ts";
import { globalVerifierRegistry } from "../../verifier-registry.ts";
import { reconcileAgents, type ReconcileResult } from "../../agent-reconciler.ts";
import {
  createBuildAdapter,
  type BuildAdapterDeps,
  type BuildRunner,
} from "./build-adapter.ts";
import { createBuildVerifier } from "./build-verifier.ts";
import { createDenoBuildRunner } from "./deno-runner.ts";

export interface BuildBootstrapOverrides extends BuildAdapterDeps {
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

export async function bootstrapBuildAdapters(
  sb: SupabaseClient,
  overrides: BuildBootstrapOverrides = {},
): Promise<void> {
  const runner: BuildRunner = overrides.runner ?? createDenoBuildRunner();
  globalVerifierRegistry.register(createBuildVerifier(), { overwrite: true });
  globalAdapterRegistry.register(
    createBuildAdapter({
      runner,
      defaultWorkspace: overrides.defaultWorkspace,
      defaultCommand: overrides.defaultCommand,
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
    const msg = `[build.bootstrap] reconcileAgents threw: ${
      e instanceof Error ? e.message : String(e)
    }`;
    if (env === "production") throw e instanceof Error ? e : new Error(msg);
    console.warn(msg);
    return;
  }
  if (!result.ok) {
    const detail = result.failed.map((f) => `${f.slug}: ${f.error}`).join("; ");
    const msg = `[build.bootstrap] reconcileAgents reported failures: ${detail}`;
    if (env === "production") throw new Error(msg);
    console.warn(msg);
  }
}

export {
  BUILD_DOMAIN,
  BUILD_ERROR_CODES,
  BUILD_EVENTS,
  BUILD_TASK_TYPES,
} from "./types.ts";
