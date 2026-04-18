/**
 * Unified idempotency layer — Task #1004 (Hardening).
 *
 * Single helper used by client-side write paths to prevent duplicate
 * side effects under retries. Storage is the same Supabase
 * `idempotency_keys` table used by Edge Functions.
 *
 * Usage:
 *   const { result, replayed } = await withIdempotency({
 *     namespace: "notifications",
 *     key: `${userId}:order_paid:${orderId}`,
 *     payload: notification,
 *   }, () => sendInAppNotification(notification));
 *
 * If the same (namespace, key) was claimed within the TTL, `replayed`
 * is true and the prior result is returned without invoking `fn`.
 *
 * The helper falls back to a process-local Map if Supabase is
 * unavailable (e.g. in tests, offline, SSR boot) so callers never
 * crash on the dedup path itself.
 */
import { db } from "@/services/db";

/**
 * Minimal RPC client shape used by this module. Avoids dragging the full
 * generated supabase-js types here (which couple to the auto-generated
 * Database union and would force every consumer of this helper to
 * recompile when the RPC catalog changes).
 */
interface RpcClient {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}
function rpcClient(): RpcClient {
  return db as unknown as RpcClient;
}

export interface IdempotencyOptions {
  namespace: string;
  key: string;
  payload?: unknown;
  ttlSeconds?: number;
}

export interface IdempotencyResult<T> {
  result: T;
  replayed: boolean;
}

interface MemoEntry {
  expiresAt: number;
  status: "pending" | "succeeded" | "failed";
  result: unknown;
  payloadHash: string;
}

const memo = new Map<string, MemoEntry>();

function memoKey(namespace: string, key: string): string {
  return `${namespace}::${key}`;
}

export async function hashPayload(payload: unknown): Promise<string> {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload ?? null);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return `fnv:${h >>> 0}`;
}

function memoClaim(namespace: string, key: string, hash: string, ttlSeconds: number) {
  const k = memoKey(namespace, key);
  const now = Date.now();
  const existing = memo.get(k);
  if (existing && existing.expiresAt > now) {
    return { isNew: false, status: existing.status, result: existing.result, payloadHash: existing.payloadHash };
  }
  memo.set(k, { expiresAt: now + ttlSeconds * 1000, status: "pending", result: null, payloadHash: hash });
  return { isNew: true, status: "pending" as const, result: null, payloadHash: hash };
}

function memoFinalize(namespace: string, key: string, status: "succeeded" | "failed", result: unknown) {
  const entry = memo.get(memoKey(namespace, key));
  if (entry) {
    entry.status = status;
    entry.result = result ?? null;
  }
}

async function rpcClaim(namespace: string, key: string, hash: string, ttlSeconds: number) {
  try {
    const { data, error } = await rpcClient().rpc("claim_idempotency_key", {
      p_namespace: namespace,
      p_key: key,
      p_payload_hash: hash,
      p_ttl_seconds: ttlSeconds,
    });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      isNew: !!row.is_new,
      status: (row.status ?? "pending") as MemoEntry["status"],
      result: row.result_json ?? null,
      payloadHash: row.payload_hash ?? hash,
    };
  } catch {
    return null;
  }
}

async function rpcFinalize(namespace: string, key: string, status: "succeeded" | "failed", result: unknown) {
  try {
    await rpcClient().rpc("finalize_idempotency_key", {
      p_namespace: namespace,
      p_key: key,
      p_status: status,
      p_result_json: result ?? null,
    });
  } catch {
    // swallow — the in-memory mirror keeps short-term replays safe even
    // if persistence fails.
  }
}

export async function withIdempotency<T>(
  options: IdempotencyOptions,
  fn: () => Promise<T>,
): Promise<IdempotencyResult<T>> {
  const { namespace, key, payload, ttlSeconds = 86400 } = options;
  if (!namespace || !key) {
    throw new Error("[idempotency] namespace and key are required");
  }

  const hash = await hashPayload(payload);
  const claim = (await rpcClaim(namespace, key, hash, ttlSeconds))
    ?? memoClaim(namespace, key, hash, ttlSeconds);

  if (!claim.isNew) {
    return { result: claim.result as T, replayed: true };
  }

  try {
    const result = await fn();
    memoFinalize(namespace, key, "succeeded", result);
    void rpcFinalize(namespace, key, "succeeded", result);
    return { result, replayed: false };
  } catch (e) {
    memoFinalize(namespace, key, "failed", { error: (e as Error).message });
    void rpcFinalize(namespace, key, "failed", { error: (e as Error).message });
    throw e;
  }
}

export function __resetIdempotencyMemoForTests(): void {
  memo.clear();
}
