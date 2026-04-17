/**
 * Content adapter framework bootstrap (task #945).
 *
 * Registers the per-row adapter, the four bespoke bulk adapters
 * (food / search / shop / media) and their verifiers on the global
 * registries used by ExecutionOrchestratorV2, then reconciles the
 * in-process manifest against `system.agents`.
 *
 * Importing this module from `execution-loop/index.ts` (gated on
 * `agent.content.enabled` / env `AGENT_CONTENT_ENABLED`) wires the
 * P4 content surface end-to-end.
 *
 * Idempotent: re-imports overwrite existing entries via { overwrite: true }.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { globalAdapterRegistry } from "../../adapter-registry.ts";
import { globalVerifierRegistry } from "../../verifier-registry.ts";
import { reconcileAgents, type ReconcileResult } from "../../agent-reconciler.ts";
import {
  createContentRowAdapter,
  type ContentRowAdapterDeps,
} from "./content-row-adapter.ts";
import {
  createContentBulkAdapter,
  type BulkRunnerRegistry,
} from "./bulk-pipeline-adapter.ts";
import {
  createSupabaseContentRowRepository,
  type ContentRowRepository,
} from "./row-repository.ts";
import {
  createContentBulkVerifier,
  createContentRowVerifier,
} from "./content-verifier.ts";
import { CONTENT_DOMAINS } from "./types.ts";

export interface ContentBootstrapOverrides {
  rowRepo?: ContentRowRepository;
  /** Bulk runner registries keyed by sub-domain. */
  runners?: Partial<Record<typeof CONTENT_DOMAINS[keyof typeof CONTENT_DOMAINS], BulkRunnerRegistry>>;
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

const FOOD_PIPELINES = [
  "food-normalizer", "food-audit", "food-publish", "food-visual-clean",
  "food-visibility-gate", "food-menu-builder", "food-rescrape-monitor",
  "deliveroo-dubai-food",
] as const;

const SEARCH_PIPELINES = [
  "sync-meilisearch-cron", "search.index.trigger", "search-global",
  "ranking-batch-runner",
] as const;

const SHOP_PIPELINES = [
  "shop-import-pipeline", "shop-import-processor",
  "shop-monitor-agent", "shop-transfer-protocol",
] as const;

const MEDIA_PIPELINES = [
  "media-processor", "video-processor", "social-preview", "extract-article",
] as const;

/**
 * No-op runner used as the framework default when bootstrap is not given
 * a real runner registry. The adapter still validates payloads, snapshots,
 * verifies and rolls back; the no-op runner just returns rows=0 with a
 * descriptive summary so downstream auditors can see the call shape.
 *
 * We intentionally surface this as a "framework not wired" warning rather
 * than silently succeeding: callers MUST register real runners before
 * the §6 drain criteria can be marked green.
 */
function makeNoopRunners(domain: string, pipelines: readonly string[]): BulkRunnerRegistry {
  const reg: BulkRunnerRegistry = {};
  for (const p of pipelines) {
    reg[p] = {
      async run() {
        return {
          summary: `[content.bootstrap] ${domain}/${p} runner not wired (framework no-op)`,
          rowsAffected: 0,
        };
      },
    };
  }
  return reg;
}

export async function bootstrapContentAdapters(
  sb: SupabaseClient,
  overrides: ContentBootstrapOverrides = {},
): Promise<void> {
  const rowRepo = overrides.rowRepo ?? createSupabaseContentRowRepository(sb as never);
  const rowDeps: ContentRowAdapterDeps = { repo: rowRepo };

  // Verifiers FIRST.
  globalVerifierRegistry.register(createContentRowVerifier(rowRepo), { overwrite: true });
  globalVerifierRegistry.register(createContentBulkVerifier(CONTENT_DOMAINS.FOOD), { overwrite: true });
  globalVerifierRegistry.register(createContentBulkVerifier(CONTENT_DOMAINS.SEARCH), { overwrite: true });
  globalVerifierRegistry.register(createContentBulkVerifier(CONTENT_DOMAINS.SHOP), { overwrite: true });
  globalVerifierRegistry.register(createContentBulkVerifier(CONTENT_DOMAINS.MEDIA), { overwrite: true });

  globalAdapterRegistry.register(createContentRowAdapter(rowDeps), { overwrite: true });

  globalAdapterRegistry.register(
    createContentBulkAdapter({
      domain: CONTENT_DOMAINS.FOOD,
      displayName: "Content · Food Pipeline",
      description:
        "Bespoke bulk adapter for food/menu pipeline runners (normalizer, " +
        "audit, publish, visual cleaner, visibility gate, menu builder, " +
        "rescrape monitor, Deliveroo Dubai sync). Approval-gated.",
      runners: overrides.runners?.[CONTENT_DOMAINS.FOOD]
        ?? makeNoopRunners(CONTENT_DOMAINS.FOOD, FOOD_PIPELINES),
      defaultRowBudget: 5_000,
    }),
    { overwrite: true },
  );

  globalAdapterRegistry.register(
    createContentBulkAdapter({
      domain: CONTENT_DOMAINS.SEARCH,
      displayName: "Content · Search Sync",
      description:
        "Bespoke bulk adapter for search index synchronisation runners " +
        "(meilisearch cron, search.index.trigger, search-global, ranking " +
        "batch runner). Approval-gated.",
      runners: overrides.runners?.[CONTENT_DOMAINS.SEARCH]
        ?? makeNoopRunners(CONTENT_DOMAINS.SEARCH, SEARCH_PIPELINES),
      defaultRowBudget: 50_000,
    }),
    { overwrite: true },
  );

  globalAdapterRegistry.register(
    createContentBulkAdapter({
      domain: CONTENT_DOMAINS.SHOP,
      displayName: "Content · Shop Import",
      description:
        "Bespoke bulk adapter for shop-import pipeline + shop-monitor / " +
        "transfer-protocol runners. Approval-gated.",
      runners: overrides.runners?.[CONTENT_DOMAINS.SHOP]
        ?? makeNoopRunners(CONTENT_DOMAINS.SHOP, SHOP_PIPELINES),
      defaultRowBudget: 10_000,
    }),
    { overwrite: true },
  );

  globalAdapterRegistry.register(
    createContentBulkAdapter({
      domain: CONTENT_DOMAINS.MEDIA,
      displayName: "Content · Media Processor",
      description:
        "Bespoke bulk adapter for media/video processors (media-processor, " +
        "video-processor, social-preview, extract-article). Approval-gated.",
      runners: overrides.runners?.[CONTENT_DOMAINS.MEDIA]
        ?? makeNoopRunners(CONTENT_DOMAINS.MEDIA, MEDIA_PIPELINES),
      defaultRowBudget: 2_000,
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
    const msg = `[content.bootstrap] reconcileAgents threw: ${e instanceof Error ? e.message : String(e)}`;
    if (env === "production") throw e instanceof Error ? e : new Error(msg);
    console.warn(msg);
    return;
  }
  if (!result.ok) {
    const detail = result.failed.map((f) => `${f.slug}: ${f.error}`).join("; ");
    const msg = `[content.bootstrap] reconcileAgents reported failures: ${detail}`;
    if (env === "production") throw new Error(msg);
    console.warn(msg);
  }
}

export { CONTENT_DOMAINS };
