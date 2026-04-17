/**
 * MarketplaceAdapter bootstrap — registers both pilot adapters and the
 * MarketplaceListingVerifier on the global registries used by
 * ExecutionOrchestratorV2.
 *
 * Importing this module from `execution-loop/index.ts` (or any other Edge
 * Function that runs the orchestrator) wires the pilot end-to-end.
 *
 * Idempotent: re-imports overwrite the existing entries so a hot-reload
 * inside a long-lived isolate does not throw.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { globalAdapterRegistry } from "../../adapter-registry.ts";
import { globalVerifierRegistry } from "../../verifier-registry.ts";
import { reconcileAgents, type ReconcileResult } from "../../agent-reconciler.ts";
import {
  createMarketplacePublishAdapter,
  createMarketplaceUnpublishAdapter,
  type DomainEvent,
  type DomainEventEmitter,
} from "./marketplace-adapter.ts";
import {
  createSupabaseListingRepository,
  type ListingRepository,
} from "./listing-repository.ts";
import {
  allowAllKyc,
  createSupabaseKycCheck,
  type KycCheck,
} from "./kyc-gate.ts";
import {
  createMarketplaceListingVerifier,
} from "./listing-verifier.ts";
import { MARKETPLACE_DOMAIN, MARKETPLACE_TASK_TYPES } from "./types.ts";

/** Default sink: persists the domain event to engine_run_logs for auditability. */
function defaultEventEmitter(sb: SupabaseClient): DomainEventEmitter {
  return {
    async emit(event: DomainEvent) {
      try {
        await sb.from("engine_run_logs").insert({
          engine_name: "marketplace-adapter",
          category: event.name,
          status: "ok",
          started_at: event.occurredAt,
          finished_at: event.occurredAt,
          duration_ms: 0,
          effect_summary: `${event.name} listing=${event.listingId}`,
          metadata_json: {
            task_id: event.taskId,
            correlation_id: event.correlationId,
            previous_state: event.previous_state,
            observed: event.observed,
            owner_id: event.ownerId,
          },
          trigger_source: "execution-loop",
        });
      } catch (e) {
        console.warn("[marketplace-adapter] event emit failed:", e);
      }
    },
  };
}

export interface MarketplaceBootstrapOverrides {
  repo?: ListingRepository;
  kyc?: KycCheck;
  events?: DomainEventEmitter;
  /**
   * When true (default), the bootstrap will reconcile the in-process adapters
   * with `system.agents` so the platform-native registry stays in lock-step
   * with the running code. Tests pass `false` to skip the network call.
   */
  reconcileAgents?: boolean;
  /** Test seam: replace the real reconcile call with a fake. */
  reconcile?: (sb: SupabaseClient) => Promise<ReconcileResult>;
}

/**
 * Production-mode reconcile failure handler:
 *   - Throws when SUPABASE_FUNCTION_ENV/DENO_ENV/NODE_ENV === 'production'.
 *   - Logs and continues otherwise (so dev/preview can boot against a fresh
 *     DB before the agent_registry migration has been applied).
 */
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

export async function bootstrapMarketplaceAdapters(
  sb: SupabaseClient,
  overrides: MarketplaceBootstrapOverrides = {},
): Promise<void> {
  const repo = overrides.repo ?? createSupabaseListingRepository(sb as never);
  const kyc = overrides.kyc ?? createSupabaseKycCheck(sb as never);
  const events = overrides.events ?? defaultEventEmitter(sb);

  // Register verifiers FIRST so the adapter execute() can read them out of
  // the global registry rather than re-creating them on every run.
  globalVerifierRegistry.register(
    createMarketplaceListingVerifier(repo, MARKETPLACE_TASK_TYPES.PUBLISH),
    { overwrite: true },
  );
  globalVerifierRegistry.register(
    createMarketplaceListingVerifier(repo, MARKETPLACE_TASK_TYPES.UNPUBLISH),
    { overwrite: true },
  );

  globalAdapterRegistry.register(
    createMarketplacePublishAdapter({ repo, kyc, events }),
    { overwrite: true },
  );
  globalAdapterRegistry.register(
    createMarketplaceUnpublishAdapter({ repo, kyc: allowAllKyc, events }),
    { overwrite: true },
  );

  // Sovereign Agent Control (L1, #808) — AWAIT the registry reconcile
  // before bootstrap returns. In production a failed reconcile is a
  // hard boot failure (the orchestrator MUST NOT serve traffic with an
  // out-of-sync registry); in dev/preview we log and continue so a fresh
  // DB without the agent_registry migration can still boot.
  if (overrides.reconcileAgents === false) return;

  const env = bootEnv();
  const reconcile = overrides.reconcile ?? reconcileAgents;
  let result: ReconcileResult;
  try {
    result = await reconcile(sb);
  } catch (e) {
    const msg = `[marketplace.bootstrap] reconcileAgents threw: ${
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
    const msg = `[marketplace.bootstrap] reconcileAgents reported failures: ${detail}`;
    if (env === "production") {
      throw new Error(msg);
    }
    console.warn(msg);
  }
}

export { MARKETPLACE_DOMAIN, MARKETPLACE_TASK_TYPES };
