/**
 * admin-merge-conflict-recovery — Operator endpoint that returns the
 * LC4 merge-conflict-recovery dashboard projection (events, perDay,
 * topFiles, affectedTasks). Auth mirrors the rest of the operator
 * surface (router origin + authenticated user + is_admin).
 *
 * The projection logic (`normalizeAudit` /
 * `projectMergeConflictRecoverySummary`) is imported from the shared,
 * runtime-agnostic module so this function and the React operator
 * dashboard cannot drift (task #979).
 */
import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import {
  MERGE_CONFLICT_RECOVERY_LOOKBACK_DAYS,
  type MergeConflictRecoveryEvent,
  normalizeAudit,
  projectMergeConflictRecoverySummary,
} from "../_shared/merge-conflict-recovery-projection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const PAGE_SIZE = 500;
const MAX_PAGES = 100;

interface ExecutionTaskRow {
  id: string;
  updated_at: string;
  payload: Record<string, unknown> | null;
}

export async function fetchMergeConflictRecoveryEvents(
  supabase: SupabaseClient,
): Promise<MergeConflictRecoveryEvent[]> {
  const since = new Date(
    Date.now() - MERGE_CONFLICT_RECOVERY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );
  const sinceIso = since.toISOString();

  const events: MergeConflictRecoveryEvent[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    let q = supabase
      .schema("system")
      .from("execution_tasks")
      .select("id, updated_at, payload")
      .not("payload->merge_conflict_recovery", "is", null)
      .gte("updated_at", sinceIso)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE);
    if (cursor) q = q.lt("updated_at", cursor);
    const { data, error } = await q;
    if (error) {
      throw new Error(
        `fetchMergeConflictRecoveryEvents failed: ${error.message}`,
      );
    }
    const rows = (data ?? []) as ExecutionTaskRow[];
    for (const row of rows) {
      const payload = row.payload ?? {};
      const history =
        (payload as { merge_conflict_recovery?: unknown }).merge_conflict_recovery;
      if (!Array.isArray(history)) continue;
      for (const raw of history) {
        const entry = normalizeAudit(raw, row.id);
        if (!entry) continue;
        if (entry.at < sinceIso) continue;
        events.push(entry);
      }
    }
    if (rows.length < PAGE_SIZE) break;
    cursor = rows[rows.length - 1]!.updated_at;
  }
  events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return events;
}

async function requireAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ isAdmin: boolean; response?: Response }> {
  if (userId === "service_role") return { isAdmin: true };
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (!data?.is_admin) {
    return {
      isAdmin: false,
      response: new Response(
        JSON.stringify({ error: "Admin privileges required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      ),
    };
  }
  return { isAdmin: true };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req);
  if (__qsCheck.rejected) return __qsCheck.response!;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;

  const auth = await requireAuthenticatedUser(req);
  if (!auth.authorized) return auth.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const adminCheck = await requireAdmin(supabase, auth.userId!);
  if (!adminCheck.isAdmin) return adminCheck.response!;

  try {
    const events = await fetchMergeConflictRecoveryEvents(supabase);
    const summary = projectMergeConflictRecoverySummary(events);
    return jsonResponse({
      ...summary,
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin-merge-conflict-recovery] error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});

// Re-export the shared types so callers that previously relied on
// import-from-edge-function (older tests, generated clients) keep
// working without reaching into the React tree.
export type {
  MergeConflictRecoveryEvent,
  MergeConflictRecoverySummary,
} from "../_shared/merge-conflict-recovery-projection.ts";
export {
  normalizeAudit,
  projectMergeConflictRecoverySummary,
} from "../_shared/merge-conflict-recovery-projection.ts";
