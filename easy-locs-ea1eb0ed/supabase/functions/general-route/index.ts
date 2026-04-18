// general-route — A general picks up its queued tasks and assigns them
// to a captain (creating sub-tasks of type 'captain_plan'). Domain-scoped.
import {
  armyClient, assertNotKilled, hasPermission, jsonResponse,
<<<<<<< HEAD
  logMessage, preflight, requireAuthenticated, requireServiceOrSupreme,
=======
  logMessage, preflight,
>>>>>>> 2c86558f9d (Task #998 — Hierarchical agent army (Command Center + Supabase))
} from "../_shared/army.ts";

interface Body { domain: string; max?: number; }

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
<<<<<<< HEAD
  const deniedAuth = await requireAuthenticated(req); if (deniedAuth) return deniedAuth;
  const deniedService = await requireServiceOrSupreme(req); if (deniedService) return deniedService;
=======
>>>>>>> 2c86558f9d (Task #998 — Hierarchical agent army (Command Center + Supabase))
  try {

    const body = (await req.json()) as Body;
    if (!body?.domain) return jsonResponse(req, { error: "domain required" }, 400);

    const sb = armyClient();
    await assertNotKilled(sb);

    const generalRole = `general_${body.domain === "security" ? "qa_sec" : body.domain}`;
    if (!await hasPermission(sb, generalRole, "task.create", body.domain)) {
      return jsonResponse(req, { error: "policy_denied" }, 403);
    }

    const { data: tasks, error } = await sb.schema("army")
      .from("execution_tasks")
      .select("id, order_id, payload, risk")
      .eq("domain", body.domain)
      .eq("type", "general_intake")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(body.max ?? 10);
    if (error) return jsonResponse(req, { error: error.message }, 500);
    if (!tasks?.length) return jsonResponse(req, { ok: true, picked: 0 });

    const subs = tasks.map((t) => ({
      order_id: t.order_id,
      parent_task_id: t.id,
      domain: body.domain,
      type: "captain_plan",
      assigned_role: "captain_generic",
      risk: t.risk,
      payload: { ...t.payload, parent_task: t.id },
    }));

    const { data: ins, error: ierr } = await sb.schema("army")
      .from("execution_tasks").insert(subs).select("id");
    if (ierr) return jsonResponse(req, { error: ierr.message }, 500);

    await sb.schema("army").from("execution_tasks")
      .update({ status: "completed", completed_at: new Date().toISOString(),
                result: { routed_to: "captain_generic", children: ins?.length ?? 0 } })
      .in("id", tasks.map((t) => t.id));

    for (const t of tasks) {
      await logMessage(sb, {
        orderId: t.order_id, taskId: t.id, fromRole: generalRole,
        toRole: "captain_generic", kind: "dispatch",
      });
    }
    return jsonResponse(req, { ok: true, picked: tasks.length, children: ins?.length });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});
