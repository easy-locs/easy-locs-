/**
 * agent-watchdog — periodic enforcement of timeouts, stall detection, and
 * dependency auto-release on `system.execution_tasks` (task #1016).
 *
 * Triggered by `autonomous-cron-dispatcher` every 60s. It does not contain
 * any business logic itself — all work is performed by the SECURITY DEFINER
 * RPC `system.run_agent_watchdog()`. This wrapper exists so the cron
 * scheduler can invoke the watchdog the same way it invokes any other
 * scheduled function, with consistent logging / DLQ / health-update flow.
 *
 * On every successful invocation it also writes a `last_run_at` timestamp
 * into `system.agent_watchdog_settings` (handled inside the RPC) so the
 * cockpit can render an "unhealthy watchdog" alert when the loop stops.
 */

import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req);
  if (__qsCheck.rejected) return __qsCheck.response!;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, key);

  const startedAt = Date.now();

  try {
    // Schema-scoped client: the RPC lives in `system`, not `public`.
    const systemClient = supabase.schema("system") as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };

    const { data, error } = await systemClient.rpc(
      "run_agent_watchdog",
      {},
    );

    if (error) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message,
          elapsed_ms: Date.now() - startedAt,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        result: data,
        elapsed_ms: Date.now() - startedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: msg,
        elapsed_ms: Date.now() - startedAt,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
