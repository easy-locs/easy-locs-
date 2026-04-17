/**
 * GitHub Runner adapter bootstrap — Phase 1 (#816).
 *
 * Registers the SMOKE_NOOP adapter and its verifier on the global registries
 * used by ExecutionOrchestratorV2. Import this module from execution-loop
 * (alongside bootstrapMarketplaceAdapters) to wire the github-runner domain.
 *
 * Idempotent: re-imports overwrite existing entries via { overwrite: true }.
 *
 * Required environment variables (set as GitHub Actions secrets and
 * Supabase Edge Function secrets):
 *   GITHUB_RUNNER_PAT   — Fine-scoped PAT or GitHub App token with
 *                         "Actions: write" permission.
 *   GITHUB_RUNNER_REPO  — "owner/repo" of the repository containing
 *                         .github/workflows/execution-runner.yml.
 *   GITHUB_RUNNER_REF   — Branch to dispatch against (default: "main").
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { globalAdapterRegistry } from "../../adapter-registry.ts";
import { globalVerifierRegistry } from "../../verifier-registry.ts";
import { createGitHubRunnerAdapter } from "./github-runner-adapter.ts";
import { createGitHubRunnerVerifier } from "./github-runner-verifier.ts";

export interface GitHubRunnerBootstrapOverrides {
  pat?: string;
  repo?: string;
  ref?: string;
  workflowFile?: string;
  supabaseUrl?: string;
}

function getEnv(key: string, fallback?: string): string {
  try {
    // deno-lint-ignore no-explicit-any
    const val = (globalThis as any)?.Deno?.env?.get?.(key);
    if (val) return val;
  } catch { /* ignore */ }
  return fallback ?? "";
}

export async function bootstrapGitHubRunnerAdapters(
  sb: SupabaseClient,
  overrides: GitHubRunnerBootstrapOverrides = {},
): Promise<void> {
  const pat = overrides.pat ?? getEnv("GITHUB_RUNNER_PAT");
  const repo = overrides.repo ?? getEnv("GITHUB_RUNNER_REPO");
  const ref = overrides.ref ?? getEnv("GITHUB_RUNNER_REF", "main");
  const workflowFile = overrides.workflowFile ?? "execution-runner.yml";
  const supabaseUrl = overrides.supabaseUrl ?? getEnv("SUPABASE_URL");

  if (!pat || !repo) {
    console.warn(
      "[github-runner.bootstrap] GITHUB_RUNNER_PAT or GITHUB_RUNNER_REPO not set — " +
      "github-runner adapter registered but dispatch will fail without these secrets.",
    );
  }

  globalVerifierRegistry.register(
    createGitHubRunnerVerifier(),
    { overwrite: true },
  );

  globalAdapterRegistry.register(
    createGitHubRunnerAdapter({ sb, pat, repo, ref, workflowFile, supabaseUrl }),
    { overwrite: true },
  );
}

export { GITHUB_RUNNER_DOMAIN, GITHUB_RUNNER_TASK_TYPES } from "./types.ts";
