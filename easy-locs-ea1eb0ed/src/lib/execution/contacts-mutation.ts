/**
 * Contacts mutation helper — task #928 (L7 P4).
 *
 * Mirror of `content-mutation.ts` for the contacts / tenant onboarding
 * domain. Behaviour is identical: dispatch fails closed, canonical
 * task types, schema-aware access. See the content helper for design
 * notes.
 */

import { db } from "@/services/db";
import { dispatchExecutionTask } from "./dispatch";

type AnyRecord = Record<string, unknown>;
type Builder = ReturnType<typeof db>;
type MutationOp = "insert" | "update" | "upsert" | "delete";

const PER_ROW_TASK = "NON_CRITICAL_DATA_FIX";
const BULK_TASK = "NON_SENSITIVE_BULK_UPDATE";
const DOMAIN = "contacts";

export interface CtFromOpts {
  schema?: string;
  source?: string;
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
  opts: CtFromOpts,
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
      source: opts.source,
    },
    idempotencyKey: opts.idempotencyKey,
    correlationId: opts.correlationId,
    metadata: { l7_phase: "P4", domain_op: `CONTACTS.${operation.toUpperCase()}`, ...opts.metadata },
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

function rootFor(opts: CtFromOpts, table: string): Builder {
  if (opts.schema) {
    return (db.schema(opts.schema as never) as { from: (t: string) => Builder }).from(table);
  }
  return db(table);
}

export function ctFrom(table: string, opts: CtFromOpts = {}): Builder {
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
      return gate.then(() => result);
    };
  }
  return builder;
}

export function ctContacts(opts: CtFromOpts = {}) {
  return {
    from(table: string) {
      return ctFrom(table, opts);
    },
    rpc<T = unknown>(name: string, args?: AnyRecord) {
      return ctRpc<T>(name, args, opts);
    },
  };
}

export function ctRpc<T = unknown>(
  name: string,
  args?: AnyRecord,
  opts: CtFromOpts = {},
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
