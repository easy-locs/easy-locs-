/**
 * Task #881 — LC3 replan trigger (testable core).
 *
 * Lives under `_shared/execution` so the unit test (vitest, Node) can
 * import it without dragging in `npm:` runtime imports or `Deno.serve`.
 * The thin Deno entry point at
 * `supabase/functions/lc3-replan-trigger/index.ts` is just the HTTP
 * + auth glue around `runLc3ReplanTrigger`.
 *
 * Behaviour: see the long header on the index.ts file. In short, we
 * scan `system.execution_tasks` for rows that an admin marked for
 * re-planning via the LC7 inbox button and route each match through
 * the SECURITY DEFINER RPC `system.dispatch_lc3_replan` — never a
 * direct table mutation (control-plane invariant #812).
 */

interface DriftRow {
  id: string;
  drift_report: Record<string, unknown> | null;
}

export interface DispatchOutcome {
  ok: boolean;
  already_dispatched?: boolean;
  original_task_id?: string;
  replan_task_id?: string | null;
  dispatched_at?: string | null;
  error?: string;
}

export interface RunOptions {
  batchSize?: number;
}

export interface RunResult {
  scanned: number;
  dispatched: number;
  already_dispatched: number;
  errors: number;
  results: Record<string, DispatchOutcome>;
  total_ms: number;
  timestamp: string;
}

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;

/**
 * The driver. Intentionally typed against `any` so the test harness can
 * supply a hand-rolled fake client without us pulling in
 * `@supabase/supabase-js` types just for a structural shape.
 */
export async function runLc3ReplanTrigger(
  // deno-lint-ignore no-explicit-any
  sb: any,
  opts: RunOptions = {},
): Promise<RunResult> {
  const startTime = Date.now();
  const batchSize = Math.min(
    Math.max(1, opts.batchSize ?? DEFAULT_BATCH_SIZE),
    MAX_BATCH_SIZE,
  );

  const { data, error } = await sb
    .schema("system")
    .from("execution_tasks")
    .select("id, drift_report")
    .eq("status", "blocked")
    .eq("blocked_reason", "BLOCKED_BY_DRIFT")
    .not("drift_report->>replan_requested_at", "is", null)
    .is("drift_report->>replan_dispatched_at", null)
    .order("updated_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    return {
      scanned: 0,
      dispatched: 0,
      already_dispatched: 0,
      errors: 1,
      results: { __scan__: { ok: false, error: error.message } },
      total_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  const rows = (data ?? []) as DriftRow[];
  const results: Record<string, DispatchOutcome> = {};
  let dispatched = 0;
  let already = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const { data: out, error: rpcErr } = await sb
        .schema("system")
        .rpc("dispatch_lc3_replan", { p_task_id: row.id });
      if (rpcErr) {
        results[row.id] = { ok: false, error: rpcErr.message };
        errors++;
        continue;
      }
      const outcome = (out ?? {}) as DispatchOutcome;
      results[row.id] = { ok: true, ...outcome };
      if (outcome.already_dispatched) already++;
      else dispatched++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results[row.id] = { ok: false, error: msg };
      errors++;
    }
  }

  return {
    scanned: rows.length,
    dispatched,
    already_dispatched: already,
    errors,
    results,
    total_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };
}
