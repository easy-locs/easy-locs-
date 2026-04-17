/**
 * WalletAdapter bootstrap — registers all four governed adapters and the
 * WalletVerifier on the global registries used by ExecutionOrchestratorV2.
 *
 * Importing this module from `execution-loop/index.ts` wires the P1 (wallet)
 * phase end-to-end behind the `agent.wallet.enabled` feature flag.
 *
 * Idempotent: re-imports overwrite existing entries.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { globalAdapterRegistry } from "../../adapter-registry.ts";
import { globalVerifierRegistry } from "../../verifier-registry.ts";
import { reconcileAgents, type ReconcileResult } from "../../agent-reconciler.ts";
import {
  createWalletCreditAdapter,
  createWalletDebitAdapter,
  createWalletTransferAdapter,
  createWalletFreezeAdapter,
  type WalletDomainEvent,
  type WalletDomainEventEmitter,
} from "./wallet-adapter.ts";
import {
  createSupabaseWalletRepository,
  type MinimalSupabaseClient as WalletMinimalSupabaseClient,
  type WalletRepository,
} from "./wallet-repository.ts";
import { createWalletVerifier } from "./wallet-verifier.ts";
import { WALLET_DOMAIN, WALLET_TASK_TYPES } from "./types.ts";

function defaultEventEmitter(sb: SupabaseClient): WalletDomainEventEmitter {
  return {
    async emit(event: WalletDomainEvent) {
      try {
        await sb.from("engine_run_logs").insert({
          engine_name: "wallet-adapter",
          category: event.name,
          status: "ok",
          started_at: event.occurredAt,
          finished_at: event.occurredAt,
          duration_ms: 0,
          effect_summary:
            `${event.name} wallet=${event.walletId}` +
            (event.counterpartyId ? `→${event.counterpartyId}` : "") +
            ` amount=${event.amount_minor} ${event.currency}`,
          metadata_json: {
            task_id: event.taskId,
            correlation_id: event.correlationId,
            previous_state: event.previous_state,
            observed: event.observed,
          },
          trigger_source: "execution-loop",
        });
      } catch (e) {
        console.warn("[wallet-adapter] event emit failed:", e);
      }
    },
  };
}

export interface WalletBootstrapOverrides {
  repo?: WalletRepository;
  events?: WalletDomainEventEmitter;
  enabled?: () => boolean;
  reconcileAgents?: boolean;
  reconcile?: (sb: SupabaseClient) => Promise<ReconcileResult>;
}

/** Cross-runtime env reader (Deno edge functions + Node vitest). */
interface EnvHost {
  Deno?: { env: { get(name: string): string | undefined } };
  process?: { env: Record<string, string | undefined> };
}
function readEnv(name: string): string | undefined {
  const host = globalThis as EnvHost;
  try {
    const v = host.Deno?.env?.get?.(name);
    if (typeof v === "string" && v.length > 0) return v;
  } catch {
    /* Deno.env is gated by --allow-env; fall through to process.env */
  }
  return host.process?.env?.[name];
}
function bootEnv(): string {
  return (
    readEnv("SUPABASE_FUNCTION_ENV") ||
    readEnv("DENO_ENV") ||
    readEnv("NODE_ENV") ||
    "development"
  );
}

function defaultEnabled(): boolean {
  const raw = readEnv("AGENT_WALLET_ENABLED");
  if (typeof raw === "string") return raw.toLowerCase() === "true";
  return bootEnv() !== "production";
}

export async function bootstrapWalletAdapters(
  sb: SupabaseClient,
  overrides: WalletBootstrapOverrides = {},
): Promise<void> {
  // See payments bootstrap: SupabaseClient is structurally a
  // WalletMinimalSupabaseClient at runtime; widen through `unknown` to satisfy
  // the npm types without an `as never` escape.
  const repo = overrides.repo ??
    createSupabaseWalletRepository(sb as unknown as WalletMinimalSupabaseClient);
  const events = overrides.events ?? defaultEventEmitter(sb);
  const enabled = overrides.enabled ?? defaultEnabled;

  for (const t of [
    WALLET_TASK_TYPES.CREDIT,
    WALLET_TASK_TYPES.DEBIT,
    WALLET_TASK_TYPES.TRANSFER,
    WALLET_TASK_TYPES.FREEZE,
  ]) {
    globalVerifierRegistry.register(createWalletVerifier(repo, t), { overwrite: true });
  }

  globalAdapterRegistry.register(createWalletCreditAdapter({ repo, events, enabled }), { overwrite: true });
  globalAdapterRegistry.register(createWalletDebitAdapter({ repo, events, enabled }), { overwrite: true });
  globalAdapterRegistry.register(createWalletTransferAdapter({ repo, events, enabled }), { overwrite: true });
  globalAdapterRegistry.register(createWalletFreezeAdapter({ repo, events, enabled }), { overwrite: true });

  if (overrides.reconcileAgents === false) return;
  const env = bootEnv();
  const reconcile = overrides.reconcile ?? reconcileAgents;
  let result: ReconcileResult;
  try {
    result = await reconcile(sb);
  } catch (e) {
    const msg = `[wallet.bootstrap] reconcileAgents threw: ${e instanceof Error ? e.message : String(e)}`;
    if (env === "production") throw e instanceof Error ? e : new Error(msg);
    console.warn(msg);
    return;
  }
  if (!result.ok) {
    const detail = result.failed.map((f) => `${f.slug}: ${f.error}`).join("; ");
    const msg = `[wallet.bootstrap] reconcileAgents reported failures: ${detail}`;
    if (env === "production") throw new Error(msg);
    console.warn(msg);
  }
}

export { WALLET_DOMAIN, WALLET_TASK_TYPES };
