/**
 * lc3-replan-trigger — Task #881
 *
 * Watches `system.execution_tasks` for rows that an admin has marked
 * for re-planning via the inbox "Replan" button (LC7 / task #874) and
 * dispatches the corresponding LC3.REPLAN execution_task on the
 * current diff via `system.dispatch_lc3_replan`.
 *
 * The driver lives in
 * `_shared/execution/lc3-replan-trigger.ts` so the unit test (vitest,
 * Node) can import it without dragging in `npm:` runtime imports or
 * `Deno.serve`. This file is the HTTP + auth glue.
 *
 * Auth: service-role only. The autonomous cron dispatcher invokes us
 * with the platform service key every 60s ("high" tier); direct
 * invocations from the browser are rejected by `requireServiceRole`.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import {
  runLc3ReplanTrigger,
  type RunOptions,
} from "../_shared/execution/lc3-replan-trigger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qs = rejectQuerySecrets(req);
  if (__qs.rejected) return __qs.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  const opts: RunOptions = {};
  try {
    const body = await req.json();
    if (
      body && typeof body === "object" &&
      typeof body.batch_size === "number"
    ) {
      opts.batchSize = body.batch_size;
    }
  } catch {
    /* GET / empty body is fine */
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const result = await runLc3ReplanTrigger(sb, opts);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
