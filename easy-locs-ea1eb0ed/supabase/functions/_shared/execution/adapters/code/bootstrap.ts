/**
 * code.edit bootstrap — registers the adapter on the global registry and
 * reconciles the agent row in `system.agents` (LC1, task #871).
 *
 * Importing this module from `execution-loop/index.ts` (or any other Edge
 * Function that runs the orchestrator) wires the Level-C primitive end to
 * end. Idempotent: re-imports overwrite the existing entry so a hot reload
 * inside a long-lived isolate does not throw.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { globalAdapterRegistry } from "../../adapter-registry.ts";
import { globalVerifierRegistry } from "../../verifier-registry.ts";
import { reconcileAgents, type ReconcileResult } from "../../agent-reconciler.ts";
import {
  createCodeEditAdapter,
  type AgentQuotaProvider,
  type WorkspaceProvider,
} from "./code-edit.ts";
import { createCodeEditVerifier } from "./code-edit-verifier.ts";
import { MemoryFs, type SandboxFs } from "./sandbox.ts";
import { createDenoWorkerWorkspaceProvider } from "./worker-sandbox.ts";
import { CODE_DOMAIN, CODE_TASK_TYPES } from "./types.ts";

export interface CodeEditBootstrapOverrides {
  /** Inject a workspace provider; default returns an empty MemoryFs. */
  workspaces?: WorkspaceProvider;
  /** Inject a live quota provider; default reads from `system.agents`. */
  agentQuotas?: AgentQuotaProvider;
  reconcileAgents?: boolean;
  reconcile?: (sb: SupabaseClient) => Promise<ReconcileResult>;
}

/**
 * Default Supabase-backed quota provider — reads
 * `system.agents.quotas->>'max_diff_bytes'` for the given slug. Caches
 * the value in-process for `ttlMs` (10s by default) to keep the per-task
 * cost low while still picking up DB changes promptly.
 */
export function createSupabaseAgentQuotaProvider(
  sb: SupabaseClient,
  ttlMs = 10_000,
): AgentQuotaProvider {
  const cache = new Map<string, { value: number | null; expires: number }>();
  return {
    async getMaxDiffBytes(slug: string): Promise<number | null> {
      const now = Date.now();
      const hit = cache.get(slug);
      if (hit && hit.expires > now) return hit.value;
      const { data, error } = await sb.schema("system")
        .from("agents")
        .select("quotas")
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data) {
        cache.set(slug, { value: null, expires: now + ttlMs });
        return null;
      }
      const raw = (data as { quotas?: Record<string, unknown> | null }).quotas?.["max_diff_bytes"];
      const value = typeof raw === "number" && raw > 0 ? raw : null;
      cache.set(slug, { value, expires: now + ttlMs });
      return value;
    },
  };
}

interface DenoEnvLike { get(name: string): string | undefined }
interface DenoLike { env?: DenoEnvLike; makeTempDir?: unknown }
interface ProcessLike { env?: Record<string, string | undefined> }

function getDeno(): DenoLike | null {
  const d = (globalThis as { Deno?: DenoLike }).Deno;
  return d ?? null;
}

function getProcess(): ProcessLike | null {
  const p = (globalThis as { process?: ProcessLike }).process;
  return p ?? null;
}

/**
 * Default workspace provider:
 *   - In Deno (Edge Function runtime): real worker-backed sandbox with
 *     temp dir per workspace and net/env/run permissions stripped.
 *   - In Node (test runners) or anywhere `Deno` is missing: in-memory FS
 *     keyed by workspace id.
 *
 * Production deployments can override via `bootstrapCodeEditAdapter({
 * workspaces })` — e.g. to point the worker provider at a pre-cloned
 * repo directory or supply a remote-storage-backed implementation.
 */
function defaultWorkspaceProvider(env: string): WorkspaceProvider {
  const deno = getDeno();
  if (deno?.makeTempDir) {
    // Production path: real worker sandbox + temp clone of the repo.
    // `CODE_EDIT_WORKSPACE_SOURCE_DIR` is REQUIRED in production — an
    // unset source dir would yield an empty workspace, which silently
    // breaks the "workspace cloned from repo" contract. Fail fast.
    const sourceDir = deno.env?.get("CODE_EDIT_WORKSPACE_SOURCE_DIR") ?? undefined;
    const baseDir = deno.env?.get("CODE_EDIT_WORKSPACE_BASE_DIR") ?? undefined;
    if (!sourceDir) {
      const msg =
        "[code-edit.bootstrap] CODE_EDIT_WORKSPACE_SOURCE_DIR is required " +
        "for the worker-backed sandbox (LC1). Set it to the absolute path " +
        "of the cloned repo on this worker before booting.";
      if (env === "production") throw new Error(msg);
      console.warn(msg + " — continuing with an empty workspace (non-prod).");
    }
    return createDenoWorkerWorkspaceProvider({ sourceDir, baseDir });
  }
  // Test path: in-memory FS, fresh per acquire so the lifecycle matches
  // the production provider (acquire→use→release with no carry-over).
  return {
    async acquire(workspace: string): Promise<SandboxFs> {
      return new MemoryFs(workspace);
    },
    async release(_fs: SandboxFs): Promise<void> {
      /* nothing to clean up for in-memory */
    },
  };
}

function bootEnv(): string {
  const denoEnv = getDeno()?.env;
  if (denoEnv) {
    const v = denoEnv.get("SUPABASE_FUNCTION_ENV") ?? denoEnv.get("DENO_ENV") ?? denoEnv.get("NODE_ENV");
    if (v) return v;
  }
  const procEnv = getProcess()?.env;
  if (procEnv?.NODE_ENV) return procEnv.NODE_ENV;
  return "development";
}

export async function bootstrapCodeEditAdapter(
  sb: SupabaseClient,
  overrides: CodeEditBootstrapOverrides = {},
): Promise<void> {
  const env = bootEnv();
  const workspaces = overrides.workspaces ?? defaultWorkspaceProvider(env);
  const agentQuotas = overrides.agentQuotas ?? createSupabaseAgentQuotaProvider(sb);

  globalVerifierRegistry.register(
    createCodeEditVerifier(),
    { overwrite: true },
  );
  globalAdapterRegistry.register(
    createCodeEditAdapter({ workspaces, agentQuotas }),
    { overwrite: true },
  );

  if (overrides.reconcileAgents === false) return;

  const reconcile = overrides.reconcile ?? reconcileAgents;
  let result: ReconcileResult;
  try {
    result = await reconcile(sb);
  } catch (e) {
    const msg = `[code-edit.bootstrap] reconcileAgents threw: ${
      e instanceof Error ? e.message : String(e)
    }`;
    if (env === "production") {
      throw e instanceof Error ? e : new Error(msg);
    }
    console.warn(msg);
    return;
  }
  if (!result.ok) {
    const detail = result.failed.map((f) => `${f.slug}: ${f.error}`).join("; ");
    const msg = `[code-edit.bootstrap] reconcileAgents reported failures: ${detail}`;
    if (env === "production") {
      throw new Error(msg);
    }
    console.warn(msg);
  }
}

export { CODE_DOMAIN, CODE_TASK_TYPES };
