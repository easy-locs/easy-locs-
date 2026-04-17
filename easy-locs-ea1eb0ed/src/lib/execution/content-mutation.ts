/**
 * Content mutation helper — task #928 (L7 P4).
 *
 * Fail-closed gateway for storefront/onboarding/content writes. Every
 * mutation routes through `dispatchExecutionTask` BEFORE the underlying
 * PostgREST request is sent. If dispatch fails the await rejects and
 * the write never reaches the network — there is no silent fallback.
 *
 * Lives in `src/lib/execution/**`, a structural exemption in
 * `.eslintrc.dispatch-allowlist.json`. Identifier names (`cFrom`,
 * `cRpc`) intentionally fall outside the easylocs `BUILDER_ROOT_NAMES`
 * /`BUILDER_ROOT_SUFFIX` regexes so call sites do not re-trigger lint.
 *
 * Risk classification matches the L7 inventory:
 *   - per-row writes  → `NON_CRITICAL_DATA_FIX`     (MEDIUM, no approval)
 *   - bulk writes     → `NON_SENSITIVE_BULK_UPDATE` (MEDIUM, approval)
 *   - rpc calls       → `NON_SENSITIVE_BULK_UPDATE` (treated as bulk)
 */

import { db } from "@/services/db";
import { dispatchExecutionTask } from "./dispatch";

type AnyRecord = Record<string, unknown>;
type Builder = ReturnType<typeof db>;
type MutationOp = "insert" | "update" | "upsert" | "delete";

const PER_ROW_TASK = "NON_CRITICAL_DATA_FIX";
const BULK_TASK = "NON_SENSITIVE_BULK_UPDATE";
const DOMAIN = "content";

export interface CFromOpts {
  /** PostgreSQL schema name; routes via `db.schema(<schema>).from(<table>)`. */
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
  opts: CFromOpts,
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

/**
 * Returns a Proxy around a PostgREST builder that gates `.then()` (the
 * point at which supabase-js fires the HTTP request) on the supplied
 * dispatch promise. The Proxy recurses into chained returns so calls
 * like `.insert(x).select().single()` remain gated.
 */
function gateBuilder<T extends object>(builder: T, gate: Promise<unknown>): T {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver) as unknown;
      if (prop === "then") {
        const orig = value as
          | (<R1, R2>(
              onfulfilled?: ((v: unknown) => R1 | PromiseLike<R1>) | null,
              onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
            ) => Promise<R1 | R2>)
          | undefined;
        if (typeof orig !== "function") return value;
        return (onfulfilled?: unknown, onrejected?: unknown) =>
          gate.then(
            () =>
              orig.call(
                target,
                onfulfilled as never,
                onrejected as never,
              ),
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

function rootFor(opts: CFromOpts, table: string): Builder {
  if (opts.schema) {
    return (db.schema(opts.schema as never) as { from: (t: string) => Builder }).from(table);
  }
  return db(table);
}

/**
 * `cFrom(table[, opts])` — drop-in replacement for `db(table)` /
 * `db.from(table)` / `domainDb.<schema>.from(table)`. Mutations
 * (`insert`, `update`, `upsert`, `delete`) record a governance task
 * before the network request fires; reads pass through.
 */
export function cFrom(table: string, opts: CFromOpts = {}): Builder {
  const builder = rootFor(opts, table) as Builder & Record<MutationOp, unknown>;
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
      // Non-thenable return: still surface dispatch failures.
      return gate.then(() => result);
    };
  }
  return builder;
}

/**
 * Convenience wrapper that mirrors the `db.from(...)` / `db.rpc(...)`
 * shape for callers that prefer chained access.
 */
export function cContent(opts: CFromOpts = {}) {
  return {
    from(table: string) {
      return cFrom(table, opts);
    },
    rpc<T = unknown>(name: string, args?: AnyRecord) {
      return cRpc<T>(name, args, opts);
    },
  };
}

/**
 * `cRpc(name, args)` — gated equivalent of `db.rpc(name, args)`.
 */
export function cRpc<T = unknown>(
  name: string,
  args?: AnyRecord,
  opts: CFromOpts = {},
): Promise<{ data: T | null; error: { message: string; code?: string } | null }> {
  const gate = recordDispatch(name, "rpc", args, {
    ...opts,
    metadata: { rpc: name, ...opts.metadata },
  });
  type RpcResult = { data: T | null; error: { message: string; code?: string } | null };
  return gate.then(() =>
    (db.rpc as (n: string, a?: AnyRecord) => Promise<RpcResult>)(name, args),
  );
}
