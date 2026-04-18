// captain-plan — Builds a fine-grained plan and dispatches one or
// more worker tasks. Critical risk → tasks land in awaiting_approval
// automatically (via DB trigger).
import {
  armyClient, assertNotKilled, hasPermission, jsonResponse, logMessage,
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  preflight, requireAuthenticated, requireServiceOrSupreme,
=======
  preflight,
>>>>>>> 2c86558f9d (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
  preflight, requireAuthenticated,
>>>>>>> 488b7d9910 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
  preflight, requireServiceOrSupreme,
>>>>>>> abc35bf8a1 (Task #998 — Hierarchical agent army (Command Center + Supabase))
} from "../_shared/army.ts";

interface Body { task_id: string; }

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  const denied = await requireServiceOrSupreme(req) || await requireAuthenticated(req);
  if (denied) return denied;
=======
>>>>>>> 2c86558f9d (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
  const denied = await requireAuthenticated(req); if (denied) return denied;
>>>>>>> 488b7d9910 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
  const denied = await requireServiceOrSupreme(req); if (denied) return denied;
>>>>>>> abc35bf8a1 (Task #998 — Hierarchical agent army (Command Center + Supabase))
  try {

    const body = (await req.json()) as Body;
    if (!body?.task_id) return jsonResponse(req, { error: "task_id required" }, 400);

    const sb = armyClient();
    await assertNotKilled(sb);
    if (!await hasPermission(sb, "captain_generic", "task.plan", null)) {
      return jsonResponse(req, { error: "policy_denied" }, 403);
    }

    const { data: task, error } = await sb.schema("army")
      .from("execution_tasks").select("*").eq("id", body.task_id).maybeSingle();
    if (error || !task) return jsonResponse(req, { error: "task_not_found" }, 404);
    if (task.type !== "captain_plan" || task.status !== "queued") {
      return jsonResponse(req, { ok: true, skipped: task.status });
    }

    await sb.schema("army").from("execution_tasks")
      .update({ status: "planning", started_at: new Date().toISOString() })
      .eq("id", task.id);

    // Minimal plan: one worker task. Could be expanded by an LLM via ai-proxy.
    const workers = [{
      order_id: task.order_id,
      parent_task_id: task.id,
      domain: task.domain,
      type: "worker_execute",
      assigned_role: "worker_generic",
      risk: task.risk,
      payload: { ...task.payload, planned_by: task.id, step: "primary" },
    }];

    const { data: ins, error: ierr } = await sb.schema("army")
      .from("execution_tasks").insert(workers).select("id, status, risk");
    if (ierr) return jsonResponse(req, { error: ierr.message }, 500);

    await sb.schema("army").from("execution_tasks")
      .update({ status: "completed", completed_at: new Date().toISOString(),
                result: { plan_size: ins?.length ?? 0 } })
      .eq("id", task.id);

    await logMessage(sb, {
      orderId: task.order_id, taskId: task.id, fromRole: "captain_generic",
      toRole: "worker_generic", kind: "dispatch",
      payload: { workers: ins?.length ?? 0 },
    });
    return jsonResponse(req, { ok: true, workers: ins });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});
