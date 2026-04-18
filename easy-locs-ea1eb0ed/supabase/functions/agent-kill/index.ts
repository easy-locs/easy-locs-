import { armyClient, jsonResponse, preflight } from "../_shared/army.ts";

interface Body { agent_id: string; reason?: string; }

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {
    const body = (await req.json()) as Body;
    if (!body?.agent_id) return jsonResponse(req, { error: "agent_id required" }, 400);
    const sb = armyClient();
=======
    const { data, error } = await sb.schema("army").rpc("kill_agent", {
      p_agent_id: body.agent_id, p_reason: body.reason ?? "manual",
    });
    if (error) return jsonResponse(req, { error: error.message }, 500);
    return jsonResponse(req, { ok: true, result: data });
>>>>>>> 2c86558f9d (Task #998 — Hierarchical agent army (Command Center + Supabase))
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});
