/**
 * PaymentsAdapter bootstrap — registers all three pilot adapters and the
 * PaymentsVerifier on the global registries used by ExecutionOrchestratorV2.
 *
 * Importing this module from `execution-loop/index.ts` (or any other Edge
 * Function that runs the orchestrator) wires the P1 (payments) phase
 * end-to-end behind the `agent.payments.enabled` feature flag.
 *
 * Idempotent: re-imports overwrite existing entries so a hot-reload inside a
 * long-lived isolate does not throw.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { globalAdapterRegistry } from "../../adapter-registry.ts";
import { globalVerifierRegistry } from "../../verifier-registry.ts";
import { reconcileAgents, type ReconcileResult } from "../../agent-reconciler.ts";
import {
  createPaymentsChargeAdapter,
  createPaymentsRefundAdapter,
  createPaymentsPayoutAdapter,
  type PaymentsDomainEvent,
  type PaymentsDomainEventEmitter,
} from "./payments-adapter.ts";
import {
  createSupabasePaymentsRepository,
  type MinimalSupabaseClient as PaymentsMinimalSupabaseClient,
  type PaymentsRepository,
} from "./payments-repository.ts";
import { createPaymentsVerifier } from "./payments-verifier.ts";
import { PAYMENTS_DOMAIN, PAYMENTS_TASK_TYPES } from "./types.ts";

/** Default sink: persists the domain event to engine_run_logs for auditability. */
function defaultEventEmitter(sb: SupabaseClient): PaymentsDomainEventEmitter {
  return {
    async emit(event: PaymentsDomainEvent) {
      try {
        await sb.from("engine_run_logs").insert({
          engine_name: "payments-adapter",
          category: event.name,
          status: "ok",
          started_at: event.occurredAt,
          finished_at: event.occurredAt,
          duration_ms: 0,
          effect_summary: `${event.name} entity=${event.entityId} amount=${event.amount_minor} ${event.currency}`,
          metadata_json: {
            task_id: event.taskId,
            correlation_id: event.correlationId,
            previous_state: event.previous_state,
            observed: event.observed,
          },
          trigger_source: "execution-loop",
        });
      } catch (e) {
        console.warn("[payments-adapter] event emit failed:", e);
      }
    },
  };
}

export interface PaymentsBootstrapOverrides {
  repo?: PaymentsRepository;
  events?: PaymentsDomainEventEmitter;
  /**
   * Feature-flag predicate. When false, the adapters still register (so
   * dispatches with this domain/type are NOT routed to NO_ADAPTER) but
   * `execute()` refuses with `ADAPTER_DISABLED` — fail-loud, not silent.
   */
  enabled?: () => boolean;
  reconcileAgents?: boolean;
  reconcile?: (sb: SupabaseClient) => Promise<ReconcileResult>;
}

/**
 * Cross-runtime env reader. Edge functions run on Deno; vitest runs on Node.
 * We expose a single typed accessor instead of sprinkling `(globalThis as any)`
 * across the bootstrap code path.
 */
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

/**
 * Reads `agent.payments.enabled` from the runtime env. Defaults to false in
 * production (canary off) and true in dev/preview so the adapter is exercised
 * by tests and local boot. Override by passing `overrides.enabled`.
 */
function defaultEnabled(): boolean {
  const raw = readEnv("AGENT_PAYMENTS_ENABLED");
  if (typeof raw === "string") return raw.toLowerCase() === "true";
  return bootEnv() !== "production";
}

export async function bootstrapPaymentsAdapters(
  sb: SupabaseClient,
  overrides: PaymentsBootstrapOverrides = {},
): Promise<void> {
  // SupabaseClient from @supabase/supabase-js implements the structural shape
  // PaymentsMinimalSupabaseClient describes; the npm types are too narrow for
  // TS to infer that, so we widen through `unknown` (no behaviour change).
  const repo = overrides.repo ??
    createSupabasePaymentsRepository(sb as unknown as PaymentsMinimalSupabaseClient);
  const events = overrides.events ?? defaultEventEmitter(sb);
  const enabled = overrides.enabled ?? defaultEnabled;

  // Register verifiers FIRST so the adapter execute() can read them out of
  // the global registry rather than re-creating them on every run.
  for (const t of [
    PAYMENTS_TASK_TYPES.CHARGE,
    PAYMENTS_TASK_TYPES.REFUND,
    PAYMENTS_TASK_TYPES.PAYOUT,
  ]) {
    globalVerifierRegistry.register(createPaymentsVerifier(repo, t), {
      overwrite: true,
    });
  }

  globalAdapterRegistry.register(
    createPaymentsChargeAdapter({ repo, events, enabled }),
    { overwrite: true },
  );
  globalAdapterRegistry.register(
    createPaymentsRefundAdapter({ repo, events, enabled }),
    { overwrite: true },
  );
  globalAdapterRegistry.register(
    createPaymentsPayoutAdapter({ repo, events, enabled }),
    { overwrite: true },
  );

  // Sovereign Agent Control (L1, #808) — AWAIT the registry reconcile.
  // Production: hard boot-fail on reconcile error; dev/preview: log & continue.
  if (overrides.reconcileAgents === false) return;

  const env = bootEnv();
  const reconcile = overrides.reconcile ?? reconcileAgents;
  let result: ReconcileResult;
  try {
    result = await reconcile(sb);
  } catch (e) {
    const msg = `[payments.bootstrap] reconcileAgents threw: ${
      e instanceof Error ? e.message : String(e)
    }`;
    if (env === "production") throw e instanceof Error ? e : new Error(msg);
    console.warn(msg);
    return;
  }
  if (!result.ok) {
    const detail = result.failed.map((f) => `${f.slug}: ${f.error}`).join("; ");
    const msg = `[payments.bootstrap] reconcileAgents reported failures: ${detail}`;
    if (env === "production") throw new Error(msg);
    console.warn(msg);
  }
}

export { PAYMENTS_DOMAIN, PAYMENTS_TASK_TYPES };
