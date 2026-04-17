/**
 * Content mutation helper (edge-function side) — task #928 (L7 P4).
 *
 * Deno-side mirror of `src/lib/execution/content-mutation.ts`. Same
 * fail-closed contract: dispatch must succeed before the underlying
 * write is executed.
 */

// @ts-expect-error — Deno remote import, resolved at edge runtime.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dispatchExecutionTask } from "./dispatch.ts";

type AnyRecord = Record<string, unknown>;
type MutationOp = "insert" | "update" | "upsert" | "delete";

const PER_ROW_TASK = "NON_CRITICAL_DATA_FIX";
const BULK_TASK = "NON_SENSITIVE_BULK_UPDATE";
const DOMAIN = "content";

export interface CFromEdgeOpts {
  schema?: string;
  correlationId?: string;
  idempotencyKey?: string;
  metadata?: AnyRecord;
}

function inferBulk(payload: unknown): { bulk: boolean; row_count: number } {
  if (Array.isArray(payload)) {
    return { bulk: payload.length > 1, row_count: payload.length };
  }
  return { bulk: false, row_count: payload === undefined ? 0 : 1 };
}

function recordDispatch(
  table: string,
  operation: MutationOp | "rpc",
  payload: unknown,
  opts: CFromEdgeOpts,
): Promise<unknown> {
  const { bulk, row_count } =
    operation === "rpc" ? { bulk: true, row_count: 0 } : inferBulk(payload);
  return dispatchExecutionTask({
    domain: DOMAIN,
    taskType: bulk ? BULK_TASK : PER_ROW_TASK,
    payload: {
      table,
      schema: opts.schema ?? "public",
      operation,
      bulk,
      row_count,
    },
    idempotencyKey: opts.idempotencyKey,
    correlationId: opts.correlationId,
    metadata: { l7_phase: "P4", domain_op: `CONTENT.${operation.toUpperCase()}`, ...opts.metadata },
  });
}

function gateBuilder<T extends object>(builder: T, gate: Promise<unknown>): T {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver) as unknown;
      if (prop === "then") {
        const orig = value as
          | ((onfulfilled?: unknown, onrejected?: unknown) => Promise<unknown>)
          | undefined;
        if (typeof orig !== "function") return value;
        return (onfulfilled?: unknown, onrejected?: unknown) =>
          gate.then(
            () => orig.call(target, onfulfilled, onrejected),
            onrejected as ((reason: unknown) => unknown) | null | undefined,
          );
      }
      if (typeof value === "function") {
        const fn = value as (...args: unknown[]) => unknown;
        return (...args: unknown[]) => {
          const result = fn.apply(target, args);
          if (result && typeof result === "object" && "then" in (result as object)) {
            return gateBuilder(result as object, gate);
          }
          return result;
        };
      }
      return value;
    },
  }) as T;
}

/**
 * `cFromEdge(sb, table[, opts])` — accepts either a full client or a
 * schema-qualified scope (e.g. `sb.schema("analytics")`). Routes the
 * eventual write through `dispatchExecutionTask` first.
 */
export function cFromEdge(
  sb: SupabaseClient,
  table: string,
  opts: CFromEdgeOpts = {},
) {
  const root = opts.schema
    ? (sb.schema(opts.schema as never) as { from: (t: string) => unknown })
    : (sb as unknown as { from: (t: string) => unknown });
  const builder = root.from(table) as Record<MutationOp, unknown> & object;
  for (const op of ["insert", "update", "upsert", "delete"] as const) {
    const original = builder[op];
    if (typeof original !== "function") continue;
    const bound = (original as (...a: unknown[]) => unknown).bind(builder);
    (builder as Record<MutationOp, unknown>)[op] = (...args: unknown[]) => {
      const gate = recordDispatch(table, op, args[0], opts);
      const result = bound(...args);
      if (result && typeof result === "object" && "then" in (result as object)) {
        return gateBuilder(result as object, gate);
      }
      return gate.then(() => result);
    };
  }
  return builder;
}

export function cRpcEdge<T = unknown>(
  sb: SupabaseClient,
  name: string,
  args?: AnyRecord,
  opts: CFromEdgeOpts = {},
): Promise<{ data: T | null; error: { message: string; code?: string } | null }> {
  const gate = recordDispatch(name, "rpc", args, {
    ...opts,
    metadata: { rpc: name, ...opts.metadata },
  });
  type RpcResult = { data: T | null; error: { message: string; code?: string } | null };
  return gate.then(() =>
    (sb.rpc as (n: string, a?: AnyRecord) => Promise<RpcResult>)(name, args ?? {}),
  );
}
