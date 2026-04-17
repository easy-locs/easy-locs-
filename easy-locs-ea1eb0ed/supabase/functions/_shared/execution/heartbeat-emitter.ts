/**
 * Sovereign Agent Control · L2 (task #810).
 * Worker-side heartbeat emitter.
 *
 * Contract (kind-agnostic — same shape for business.adapter, dev.builder,
 * asis.cognitive, …):
 *
 *   const beat = createHeartbeatEmitter({
 *     agentSlug: "marketplace.publish",
 *     workerId,                       // see deriveWorkerId()
 *     getInFlight:  () => orchestrator.inFlightCount(),
 *     getQueueDepth:() => orchestrator.queuedCount(),
 *     cadenceMs: 15000,
 *   });
 *   beat.start();                     // setInterval pinned to this worker
 *   beat.emitNow();                   // call after task accept / complete
 *   beat.stop();                      // on graceful shutdown
 *
 * Hard guarantees:
 *   * Best-effort: emit() NEVER throws and NEVER blocks task execution.
 *   * Re-entrant safe: overlapping emits are coalesced — only one inflight
 *     RPC call at a time per emitter instance.
 *   * No branching on agent_kind anywhere; the same emitter ships every
 *     future agent kind.
 *   * Worker identity is deterministic per process (`hostname:pid:bootUuid`)
 *     so multiple workers per agent are visible in the registry.
 */

// NOTE: The supabase-js client is imported lazily inside
// `createServiceRoleHeartbeatRpc` so this module is safe to import from
// Node-based test runners (vitest) that cannot resolve `https://esm.sh/…`.
// The Deno edge runtime resolves the import on first use.

export interface HeartbeatRpc {
  /**
   * Calls `system.record_agent_heartbeat(...)`. Implementations MUST swallow
   * their own transport errors and resolve to `{ ok: false }` rather than
   * rejecting — the emitter relies on this to keep `emit()` total.
   */
  call(input: HeartbeatPayload): Promise<HeartbeatRpcResult>;
}

export interface HeartbeatPayload {
  agentSlug: string;
  workerId: string;
  inFlight: number;
  queueDepth: number;
  cpuPct?: number | null;
  memMb?: number | null;
  region?: string | null;
  custom?: Record<string, unknown>;
  version?: string | null;
}

export interface HeartbeatRpcResult {
  ok: boolean;
  agentId?: string | null;
  healthStatus?: string | null;
  reason?: string | null;
  errorMessage?: string;
}

export interface HeartbeatEmitterOptions {
  agentSlug: string;
  workerId: string;
  cadenceMs?: number;
  getInFlight?: () => number;
  getQueueDepth?: () => number;
  getCpuPct?: () => number | null | undefined;
  getMemMb?: () => number | null | undefined;
  region?: string | null;
  version?: string | null;
  custom?: () => Record<string, unknown>;
  /**
   * Defaults to a service-role-backed RPC client built from
   * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Tests inject their own.
   */
  rpc?: HeartbeatRpc;
  /**
   * Optional sink for observability — the emitter never throws, but a
   * caller that wants to surface failures (e.g. log them) can subscribe.
   */
  onResult?: (result: HeartbeatRpcResult) => void;
  /**
   * Optional clock for tests.
   */
  now?: () => number;
}

export interface HeartbeatEmitter {
  start(): void;
  stop(): void;
  /** Force an immediate emit — coalesced if one is already in flight. */
  emitNow(): Promise<void>;
  /** Currently scheduled cadence in ms. */
  readonly cadenceMs: number;
  /** Stable worker id used by this emitter. */
  readonly workerId: string;
}

export const DEFAULT_HEARTBEAT_CADENCE_MS = 15_000;

/**
 * Deterministic worker identity. The same process always produces the same
 * id, multiple processes on the same host produce different ids, and a
 * restart produces a fresh id (so a "ghost" heartbeat never collides with
 * the new boot).
 */
export function deriveWorkerId(opts: {
  hostname?: string;
  pid?: number;
  bootUuid?: string;
} = {}): string {
  const hostname = opts.hostname ?? defaultHostname();
  const pid = opts.pid ?? defaultPid();
  const bootUuid = opts.bootUuid ?? getOrCreateBootUuid();
  return `${hostname}:${pid}:${bootUuid}`;
}

let _bootUuid: string | null = null;
function getOrCreateBootUuid(): string {
  if (_bootUuid) return _bootUuid;
  // crypto.randomUUID is available in modern Node, Deno, and Edge runtimes.
  // Fall back to a Math-based id only as a last resort (still unique enough
  // for in-process determinism since it's cached for the lifetime of the
  // process).
  try {
    _bootUuid = (globalThis.crypto as Crypto).randomUUID();
  } catch {
    _bootUuid = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
  return _bootUuid;
}

function defaultHostname(): string {
  // Deno
  // @ts-expect-error — runtime check
  if (typeof Deno !== "undefined" && typeof Deno.hostname === "function") {
    // @ts-expect-error
    try { return Deno.hostname(); } catch { /* permission denied */ }
  }
  // Node-ish
  // @ts-expect-error
  const env = (globalThis.process?.env ?? {}) as Record<string, string>;
  return env.HOSTNAME || env.HOST || "worker";
}

function defaultPid(): number {
  // @ts-expect-error
  if (typeof Deno !== "undefined" && typeof Deno.pid === "number") {
    // @ts-expect-error
    return Deno.pid;
  }
  // @ts-expect-error
  return globalThis.process?.pid ?? 0;
}

/**
 * Default RPC implementation — service-role supabase client. Constructed
 * lazily so importing this file is safe in non-Deno environments.
 */
export function createServiceRoleHeartbeatRpc(): HeartbeatRpc {
  // Lazy: only resolve the supabase-js client on the first heartbeat,
  // and only inside the Deno edge runtime. This keeps the module importable
  // from Node-based test runners.
  let clientPromise: Promise<unknown> | null = null;
  async function get(): Promise<{
    schema: (s: string) => {
      rpc: (n: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  }> {
    if (!clientPromise) {
      clientPromise = (async () => {
        // @ts-expect-error — Deno global at edge runtime
        const url = Deno.env.get("SUPABASE_URL");
        // @ts-expect-error — Deno global at edge runtime
        const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!url || !key) {
          throw new Error(
            "[heartbeat-emitter] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing",
          );
        }
        // Dynamic import keeps the static module graph free of the
        // `https://esm.sh/...` URL that Node's ESM loader rejects.
        const mod = await import(/* @vite-ignore */ "https://esm.sh/@supabase/supabase-js@2");
        const createClient = (mod as { createClient: (u: string, k: string, o: unknown) => unknown }).createClient;
        return createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      })();
    }
    return clientPromise as Promise<ReturnType<typeof get>>;
  }

  return {
    async call(input: HeartbeatPayload): Promise<HeartbeatRpcResult> {
      try {
        const c = await get();
        const { data, error } = await c
          .schema("system")
          .rpc("record_agent_heartbeat", {
            p_agent_slug:  input.agentSlug,
            p_worker_id:   input.workerId,
            p_in_flight:   input.inFlight,
            p_queue_depth: input.queueDepth,
            p_cpu_pct:     input.cpuPct ?? null,
            p_mem_mb:      input.memMb ?? null,
            p_region:      input.region ?? null,
            p_custom:      input.custom ?? {},
            p_version:     input.version ?? null,
          });
        if (error) {
          return { ok: false, errorMessage: error.message };
        }
        const row = Array.isArray(data) ? (data[0] ?? null) : data;
        return {
          ok: Boolean(row?.recorded ?? true),
          agentId: row?.agent_id ?? null,
          healthStatus: row?.health_status ?? null,
          reason: row?.reason ?? null,
        };
      } catch (e) {
        return {
          ok: false,
          errorMessage: e instanceof Error ? e.message : String(e),
        };
      }
    },
  };
}

/**
 * Create a heartbeat emitter for a single (agent, worker) pair.
 *
 * The emitter never throws from `start`, `stop`, or `emitNow`.
 */
export function createHeartbeatEmitter(
  opts: HeartbeatEmitterOptions,
): HeartbeatEmitter {
  const cadenceMs = Math.max(1_000, opts.cadenceMs ?? DEFAULT_HEARTBEAT_CADENCE_MS);
  const rpc = opts.rpc ?? createServiceRoleHeartbeatRpc();

  let timer: ReturnType<typeof setInterval> | null = null;
  let inflight = false;

  async function emitOnce(): Promise<void> {
    if (inflight) return;
    inflight = true;
    try {
      const payload: HeartbeatPayload = {
        agentSlug: opts.agentSlug,
        workerId: opts.workerId,
        inFlight:  safeInt(opts.getInFlight?.() ?? 0),
        queueDepth: safeInt(opts.getQueueDepth?.() ?? 0),
        cpuPct: opts.getCpuPct?.() ?? null,
        memMb:  opts.getMemMb?.() ?? null,
        region: opts.region ?? null,
        custom: opts.custom?.() ?? {},
        version: opts.version ?? null,
      };
      let result: HeartbeatRpcResult;
      try {
        result = await rpc.call(payload);
      } catch (e) {
        // RPC implementations MUST resolve, not reject — but defensively
        // guard anyway so a buggy RPC never escapes.
        result = {
          ok: false,
          errorMessage: e instanceof Error ? e.message : String(e),
        };
      }
      try { opts.onResult?.(result); } catch { /* swallow */ }
    } finally {
      inflight = false;
    }
  }

  return {
    cadenceMs,
    workerId: opts.workerId,
    start(): void {
      if (timer) return;
      // Fire one immediately so a freshly-booted worker is visible without
      // waiting for the first tick.
      void emitOnce();
      timer = setInterval(() => { void emitOnce(); }, cadenceMs);
      // Don't keep the runtime alive just for heartbeats (Node only).
      const t = timer as unknown as { unref?: () => void };
      try { t.unref?.(); } catch { /* not Node */ }
    },
    stop(): void {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    },
    async emitNow(): Promise<void> {
      await emitOnce();
    },
  };
}

function safeInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}
