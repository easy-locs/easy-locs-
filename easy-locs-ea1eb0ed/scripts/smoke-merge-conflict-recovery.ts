#!/usr/bin/env -S npx tsx
/**
 * smoke-merge-conflict-recovery.ts — Task #915 / #925
 *
 * Staged operator smoke. Validates the production wiring of the
 * dev-builder merge-conflict recovery loop end-to-end against a real
 * sandbox Supabase project:
 *
 *   1. Insert a fake `EXECUTE_DEV_PLAN` row into `system.execution_tasks`.
 *   2. Invoke `system.request_dev_replan(builder_task_id, reason)` with
 *      the *exact* reason string the LC4 loop forwards from the
 *      pre-merge drift hook on a real overlap:
 *          "merge_conflict:overlap_with:agent-task-A"
 *   3. Read the parent row back and assert:
 *        - `payload.last_replan.reason` is captured **verbatim**
 *        - it starts with `merge_conflict:overlap_with:`
 *        - a child `LC3.PLAN.PRODUCE` row exists with parent_task_id = builder
 *
 * The integration test
 *   src/__tests__/lc9-level-c-governance.integration.test.ts (scenario 4b)
 * already proves end-to-end *in-memory* that `runDevBuilderLoop` forwards
 * the reason verbatim from `runPreMergeDriftCheck` into `requestReplan`.
 * What it cannot prove is that the SQL RPC, *deployed against real
 * Postgres*, faithfully captures that string into the audit trail. That
 * is exactly what this smoke proves.
 *
 * Required env:
 *   SUPABASE_URL                  https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY     project service_role key
 *
 * Optional env:
 *   SMOKE_LOG_PATH                where to write the JSON log
 *                                 (default: ./smoke-merge-conflict-recovery.log.json)
 *   SMOKE_REASON                  override the reason string
 *                                 (default: merge_conflict:overlap_with:agent-task-A)
 *
 * Exit code: 0 on success, non-zero on any failed assertion.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REASON = process.env.SMOKE_REASON ?? "merge_conflict:overlap_with:agent-task-A";
const LOG_PATH = resolve(
  process.env.SMOKE_LOG_PATH ?? "./smoke-merge-conflict-recovery.log.json",
);

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

interface StepLog {
  step: string;
  ok: boolean;
  detail?: unknown;
  error?: string;
}

const log: {
  started_at: string;
  reason: string;
  supabase_url: string;
  steps: StepLog[];
  final?: { ok: boolean; builder_task_id: string; last_replan?: unknown };
} = {
  started_at: new Date().toISOString(),
  reason: REASON,
  supabase_url: SUPABASE_URL,
  steps: [],
};

function flush() {
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

function record(step: string, ok: boolean, detail?: unknown, error?: string) {
  log.steps.push({ step, ok, detail, error });
  flush();
  const tag = ok ? "OK" : "FAIL";
  console.log(`[${tag}] ${step}`);
  if (!ok && error) console.error(`     ${error}`);
}

async function main(): Promise<number> {
  const sb = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { persistSession: false },
    db: { schema: "system" },
  });

  // --- 1. seed builder row ----------------------------------------------
  const { data: builder, error: insertErr } = await sb
    .from("execution_tasks")
    .insert({
      type: "EXECUTE_DEV_PLAN",
      domain: "builder",
      risk_level: "MEDIUM",
      status: "running",
      requested_by: "smoke.task-925",
      payload: {
        plan: {
          plan_id: "smoke-merge-conflict",
          revision: 1,
          goal: "smoke task 925",
          steps: [{ id: "s1", kind: "code.edit", payload: {} }],
        },
      },
    })
    .select("id")
    .single();
  if (insertErr || !builder) {
    record("seed_builder_row", false, null, insertErr?.message);
    return 1;
  }
  record("seed_builder_row", true, { builder_task_id: builder.id });
  const builderId = builder.id as string;

  // --- 2. invoke RPC verbatim with merge_conflict reason ----------------
  const { data: rpcData, error: rpcErr } = await sb.rpc("request_dev_replan", {
    p_builder_task_id: builderId,
    p_reason: REASON,
  });
  if (rpcErr) {
    record("invoke_request_dev_replan", false, null, rpcErr.message);
    return 1;
  }
  record("invoke_request_dev_replan", true, rpcData);
  const replanTaskId = (rpcData as { replan_task_id?: string } | null)?.replan_task_id;

  // --- 3. read parent row and assert audit trail ------------------------
  const { data: parent, error: readErr } = await sb
    .from("execution_tasks")
    .select("id, payload")
    .eq("id", builderId)
    .single();
  if (readErr || !parent) {
    record("read_parent_row", false, null, readErr?.message);
    return 1;
  }
  const lastReplan = (parent.payload as { last_replan?: { reason?: string } } | null)
    ?.last_replan;
  record("read_parent_row", true, { last_replan: lastReplan });

  if (!lastReplan?.reason) {
    record("assert_reason_captured", false, lastReplan, "payload.last_replan.reason missing");
    return 1;
  }
  record("assert_reason_captured", true, { reason: lastReplan.reason });

  if (lastReplan.reason !== REASON) {
    record(
      "assert_reason_verbatim",
      false,
      { expected: REASON, actual: lastReplan.reason },
      "reason was not stored verbatim",
    );
    return 1;
  }
  record("assert_reason_verbatim", true, { reason: lastReplan.reason });

  if (!lastReplan.reason.startsWith("merge_conflict:overlap_with:")) {
    record(
      "assert_reason_prefix",
      false,
      { reason: lastReplan.reason },
      "reason did not start with merge_conflict:overlap_with:",
    );
    return 1;
  }
  record("assert_reason_prefix", true, { reason: lastReplan.reason });

  // --- 4. assert child LC3 row exists -----------------------------------
  if (!replanTaskId) {
    record("assert_replan_child_id_returned", false, rpcData, "no replan_task_id");
    return 1;
  }
  record("assert_replan_child_id_returned", true, { replan_task_id: replanTaskId });

  const { data: child, error: childErr } = await sb
    .from("execution_tasks")
    .select("id, type, status, parent_task_id")
    .eq("id", replanTaskId)
    .single();
  if (childErr || !child) {
    record("read_replan_child", false, null, childErr?.message);
    return 1;
  }
  record("read_replan_child", true, child);

  const childOk = child.type === "LC3.PLAN.PRODUCE" &&
    child.status === "queued" &&
    child.parent_task_id === builderId;
  record("assert_replan_child_shape", childOk, child,
    childOk ? undefined : "child row did not match expected LC3 shape");
  if (!childOk) return 1;

  log.final = {
    ok: true,
    builder_task_id: builderId,
    last_replan: lastReplan,
  };
  flush();
  return 0;
}

main().then((code) => {
  console.log(`\nSmoke exit code: ${code}`);
  console.log(`Log written to: ${LOG_PATH}`);
  process.exit(code);
}).catch((e) => {
  record("uncaught", false, null, String(e?.stack ?? e));
  process.exit(1);
});
