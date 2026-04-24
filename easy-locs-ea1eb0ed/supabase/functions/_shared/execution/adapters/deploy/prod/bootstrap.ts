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
  type DeployProdPostDeployHook,
  type DeployProdRunner,
} from "./deploy-prod-adapter.ts";
import { createDeployProdVerifier } from "./deploy-prod-verifier.ts";
import { createDeployProdRollbackVerifier } from "./deploy-prod-rollback-verifier.ts";
import { createVercelProdRunner } from "../vercel-runner.ts";
// LC6 (#877): post-deploy health-check + auto-rollback wiring.
import {
  createPostDeployHook,
  createRevertPrRollbackHandler,
  type RevertPrHandlerDeps,
} from "./lc6-glue.ts";
import { createDeployProdRollbackAdapter } from "./deploy-prod-rollback-adapter.ts";
import type { HealthCheckOptions } from "../../../post-deploy/health-check.ts";

export interface DeployProdBootstrapOverrides extends DeployProdAdapterDeps {
  reconcileAgents?: boolean;
  reconcile?: (sb: SupabaseClient) => Promise<ReconcileResult>;
  // ── LC6 wiring (#877) ────────────────────────────────────────────────
  /**
   * Inject a GithubRevertClient (octokit-shaped). When set, the bootstrap
   * registers a `revert_pr` rollback handler on the adapter AND installs
   * the post-deploy health-check hook that marks the deploy task `failed`
   * with `DEPLOY_HEALTH_CHECK_FAILED` when `/api/health` does not settle
   * green inside the watch window.
   *
   * Auto-rollback itself is dispatched by a SEPARATE post-settlement
   * reconciler (see `dispatchAutoRollbackForSettledTask` in lc6-glue.ts),
   * because `system.request_rollback` requires status ∈ {failed,
   * succeeded} and the hook runs while the row is still `running`.
   */
  github?: RevertPrHandlerDeps;
  /** Health-check tuning passed through to runPostDeployHealthCheck. */
  healthCheck?: Omit<HealthCheckOptions, "url">;
  /** Disable LC6 post-deploy + revert_pr wiring entirely (testing). */
  disableLc6?: boolean;
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

  // ── LC6 (#877): wire health-check + revert_pr only when github is set ──
  let postDeploy: DeployProdPostDeployHook | undefined = overrides.postDeploy;
  let rollbackHandler = overrides.rollbackHandler;
  if (!overrides.disableLc6 && overrides.github) {
    rollbackHandler = rollbackHandler ??
      createRevertPrRollbackHandler(overrides.github);
    if (!postDeploy) {
      // Hook only runs the health probe. It does NOT dispatch
      // `system.request_rollback` from inside execute() — L3 requires
      // the row be in `failed | succeeded`, so auto-rollback is
      // dispatched by the post-settlement reconciler instead.
      postDeploy = createPostDeployHook({ health: overrides.healthCheck });
    }
  }

  globalAdapterRegistry.register(
    createDeployProdAdapter({
      runner,
      defaultTeam: overrides.defaultTeam,
      keyEnv,
      postDeploy,
      rollbackHandler,
      rollbackStrategyName: overrides.rollbackStrategyName,
    }),
    { overwrite: true },
  );

  // LC6 (#877): register the child rollback adapter too. Every
  // auto-rollback inserts a new `deploy.prod.rollback` row
  // (parent_task_id linked) with full lifecycle + audit; this adapter
  // is what the orchestrator dispatches to execute the revert.
  if (!overrides.disableLc6 && overrides.github) {
    globalAdapterRegistry.register(
      createDeployProdRollbackAdapter({
        client: overrides.github.client,
        defaultRepo: overrides.github.repo,
        defaultBranch: overrides.github.branch,
      }),
      { overwrite: true },
    );
    // LC6 (#877): register the child-row verifier so the orchestrator
    // can ratify successful revert_pr runs. Without it,
    // ExecutionOrchestratorV2 refuses to settle the row `succeeded`
    // (NO_VERIFIER → status `blocked`).
    globalVerifierRegistry.register(
      createDeployProdRollbackVerifier(),
      { overwrite: true },
    );
  }

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
