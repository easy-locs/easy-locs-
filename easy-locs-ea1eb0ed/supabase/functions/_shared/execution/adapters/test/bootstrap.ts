/**
 * Test adapter bootstrap — LC2 (task #872).
 *
 * Registers the TestAdapter and verifier on the global registries,
 * defaulting the runner to a real Vitest runner backed by `Deno.Command`.
 * Mirrors the marketplace bootstrap shape so execution-loop wires it the
 * same way.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { globalAdapterRegistry } from "../../adapter-registry.ts";
import { globalVerifierRegistry } from "../../verifier-registry.ts";
import { reconcileAgents, type ReconcileResult } from "../../agent-reconciler.ts";
import {
  createTestAdapter,
  type TestAdapterDeps,
  type TestRunner,
} from "./test-adapter.ts";
import { createTestVerifier } from "./test-verifier.ts";
import { createDenoTestRunner } from "./deno-runner.ts";

export interface TestBootstrapOverrides extends TestAdapterDeps {
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

export async function bootstrapTestAdapters(
  sb: SupabaseClient,
  overrides: TestBootstrapOverrides = {},
): Promise<void> {
  const runner: TestRunner = overrides.runner ?? createDenoTestRunner();
  globalVerifierRegistry.register(createTestVerifier(), { overwrite: true });
  globalAdapterRegistry.register(
    createTestAdapter({
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
    const msg = `[test.bootstrap] reconcileAgents threw: ${
      e instanceof Error ? e.message : String(e)
    }`;
    if (env === "production") throw e instanceof Error ? e : new Error(msg);
    console.warn(msg);
    return;
  }
  if (!result.ok) {
    const detail = result.failed.map((f) => `${f.slug}: ${f.error}`).join("; ");
    const msg = `[test.bootstrap] reconcileAgents reported failures: ${detail}`;
    if (env === "production") throw new Error(msg);
    console.warn(msg);
  }
}

export {
  TEST_DOMAIN,
  TEST_ERROR_CODES,
  TEST_EVENTS,
  TEST_TASK_TYPES,
} from "./types.ts";
