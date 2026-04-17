/**
 * Contacts adapter framework bootstrap (task #945).
 *
 * Registers the sync + upsert adapters and their verifiers on the
 * global registries used by ExecutionOrchestratorV2, then reconciles
 * the in-process manifest against `system.agents`.
 *
 * Importing this module from `execution-loop/index.ts` (gated on
 * `agent.contacts.enabled` / env `AGENT_CONTACTS_ENABLED`) wires the
 * P4 contacts surface end-to-end.
 *
 * Idempotent: re-imports overwrite existing entries via { overwrite: true }.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { globalAdapterRegistry } from "../../adapter-registry.ts";
import { globalVerifierRegistry } from "../../verifier-registry.ts";
import { reconcileAgents, type ReconcileResult } from "../../agent-reconciler.ts";
import {
  createContactsSyncAdapter,
  createContactsUpsertAdapter,
  type ContactsSyncRunnerRegistry,
  type ContactsUpsertAdapterDeps,
} from "./contacts-adapter.ts";
import {
  createSupabaseContactsRepository,
  type ContactsRepository,
} from "./contacts-repository.ts";
import {
  createContactsSyncVerifier,
  createContactsUpsertVerifier,
} from "./contacts-verifier.ts";
import { CONTACTS_DOMAINS } from "./types.ts";

/** Provider keys called out in §5 of the P4 phase plan. */
const SYNC_PROVIDERS = [
  "tenant-signup",
  "auto-onboarding-cron",
  "uae-scrape-onboard",
  "dld-sync-cron",
  "dld-sync",
  "prayer-times",
  "prayer-push-cron",
  "reveal-contact",
  "social-graph",
  "address-resolver",
  "onboarding-providers",
  "badge-system",
  "workspace-core",
  "i18n-bootstrap",
  "recrawl-runner",
  "canonical-record-write",
  "import-run-write",
] as const;

export interface ContactsBootstrapOverrides {
  repo?: ContactsRepository;
  syncRunners?: ContactsSyncRunnerRegistry;
  compensators?: ContactsUpsertAdapterDeps["compensators"];
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

function makeNoopSyncRunners(providers: readonly string[]): ContactsSyncRunnerRegistry {
  const reg: ContactsSyncRunnerRegistry = {};
  for (const p of providers) {
    reg[p] = {
      async run() {
        return {
          summary: `[contacts.bootstrap] sync runner ${p} not wired (framework no-op)`,
          rowsAffected: 0,
        };
      },
    };
  }
  return reg;
}

export async function bootstrapContactsAdapters(
  sb: SupabaseClient,
  overrides: ContactsBootstrapOverrides = {},
): Promise<void> {
  const repo = overrides.repo ?? createSupabaseContactsRepository(sb as never);
  const syncRunners = overrides.syncRunners ?? makeNoopSyncRunners(SYNC_PROVIDERS);

  // Verifiers FIRST.
  globalVerifierRegistry.register(createContactsSyncVerifier(repo), { overwrite: true });
  globalVerifierRegistry.register(createContactsUpsertVerifier(repo), { overwrite: true });

  globalAdapterRegistry.register(
    createContactsSyncAdapter({ repo, runners: syncRunners, defaultRowBudget: 5_000 }),
    { overwrite: true },
  );
  globalAdapterRegistry.register(
    createContactsUpsertAdapter({ repo, compensators: overrides.compensators }),
    { overwrite: true },
  );

  if (overrides.reconcileAgents === false) return;
  const env = bootEnv();
  const reconcile = overrides.reconcile ?? reconcileAgents;
  let result: ReconcileResult;
  try {
    result = await reconcile(sb);
  } catch (e) {
    const msg = `[contacts.bootstrap] reconcileAgents threw: ${e instanceof Error ? e.message : String(e)}`;
    if (env === "production") throw e instanceof Error ? e : new Error(msg);
    console.warn(msg);
    return;
  }
  if (!result.ok) {
    const detail = result.failed.map((f) => `${f.slug}: ${f.error}`).join("; ");
    const msg = `[contacts.bootstrap] reconcileAgents reported failures: ${detail}`;
    if (env === "production") throw new Error(msg);
    console.warn(msg);
  }
}

export { CONTACTS_DOMAINS };
