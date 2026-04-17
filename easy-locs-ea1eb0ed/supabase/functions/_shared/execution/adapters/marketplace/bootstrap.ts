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
import { reconcileAgents } from "../../agent-reconciler.ts";
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
}

export function bootstrapMarketplaceAdapters(
  sb: SupabaseClient,
  overrides: MarketplaceBootstrapOverrides = {},
): void {
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

  // Sovereign Agent Control (L1, #808) — best-effort upsert of the in-process
  // adapters into `system.agents`. Failure does NOT prevent boot; the seed in
  // migration 20260419000000_agent_registry.sql guarantees the rows exist.
  if (overrides.reconcileAgents !== false) {
    reconcileAgents(sb).catch((e) =>
      console.warn("[marketplace.bootstrap] reconcileAgents failed:", e),
    );
  }
}

export { MARKETPLACE_DOMAIN, MARKETPLACE_TASK_TYPES };
