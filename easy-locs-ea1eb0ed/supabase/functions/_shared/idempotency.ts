/**
 * Shared idempotency helper for Edge Functions (Deno runtime).
 *
 * Contract — Task #1004 (Hardening):
 *   key  = namespace + operation + sha256(payload)
 *   TTL  = configurable, default 24h
 *
 * Replays of the same (namespace, key) within the TTL never re-execute
 * the wrapped side effect; the prior result_json is returned instead.
 *
 * Storage: public.idempotency_keys (see migration
 * 20260503000000_hardening_idempotency_keys.sql).
 */
<<<<<<< HEAD
/**
 * Minimal RPC client shape used by the shared idempotency helper.
 * Avoids importing the full supabase-js typings (which require the Deno
 * import map and the generated Database union) into shared code.
 */
type SupabaseClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};
=======
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;
>>>>>>> ef8e1ca202 (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)

export interface ClaimResult {
  isNew: boolean;
  status: "pending" | "succeeded" | "failed";
  result: unknown;
  payloadHash: string | null;
}

export async function hashPayload(payload: unknown): Promise<string> {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload ?? null);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function claimIdempotencyKey(
  supabase: SupabaseClient,
  namespace: string,
  key: string,
  payload: unknown,
  ttlSeconds = 86400,
): Promise<ClaimResult> {
  const payloadHash = await hashPayload(payload);
  const { data, error } = await supabase.rpc("claim_idempotency_key", {
    p_namespace: namespace,
    p_key: key,
    p_payload_hash: payloadHash,
    p_ttl_seconds: ttlSeconds,
  });

  if (error) {
    // Fail-open: log and treat as new. Better to risk a duplicate than to
    // drop a real notification or webhook entirely.
    console.warn(`[idempotency] claim failed (${namespace}:${key}): ${error.message}`);
    return { isNew: true, status: "pending", result: null, payloadHash };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    isNew: !!row?.is_new,
    status: (row?.status ?? "pending") as ClaimResult["status"],
    result: row?.result_json ?? null,
    payloadHash: row?.payload_hash ?? payloadHash,
  };
}

export async function finalizeIdempotencyKey(
  supabase: SupabaseClient,
  namespace: string,
  key: string,
  status: "succeeded" | "failed",
  result: unknown,
): Promise<void> {
  try {
    await supabase.rpc("finalize_idempotency_key", {
      p_namespace: namespace,
      p_key: key,
      p_status: status,
      p_result_json: result ?? null,
    });
  } catch (e) {
    console.warn(`[idempotency] finalize failed (${namespace}:${key}): ${(e as Error).message}`);
  }
}

/**
 * Wrap a side-effecting function so a replay of the same (namespace, key)
 * returns the cached result instead of re-executing.
 */
export async function withIdempotency<T>(
  supabase: SupabaseClient,
  namespace: string,
  key: string,
  payload: unknown,
  fn: () => Promise<T>,
  ttlSeconds = 86400,
): Promise<{ result: T; replayed: boolean }> {
  const claim = await claimIdempotencyKey(supabase, namespace, key, payload, ttlSeconds);

  if (!claim.isNew && claim.status === "succeeded") {
    return { result: claim.result as T, replayed: true };
  }
  if (!claim.isNew && claim.status === "pending") {
    // Concurrent in-flight execution. Return a marker; caller decides.
    return { result: claim.result as T, replayed: true };
  }

  try {
    const result = await fn();
    await finalizeIdempotencyKey(supabase, namespace, key, "succeeded", result);
    return { result, replayed: false };
  } catch (e) {
    await finalizeIdempotencyKey(supabase, namespace, key, "failed", {
      error: (e as Error).message,
    });
    throw e;
  }
}
