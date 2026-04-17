/**
 * Track 3 (#843) — Command Center dispatch helper.
 *
 * The DashboardCommandCenter UI no longer writes `agent_tasks` directly.
 * Every prompt MUST go through the canonical dispatch path:
 *
 *   1. invoke the `trigger-github` Edge Function (admin-gated, embeds the
 *      prompt in `p_payload`, calls `system.dispatch_execution_task` with
 *      `p_runner='github'`)
 *   2. read the freshly inserted row from `system.execution_tasks` so the
 *      UI can render it immediately
 *
 * This module is the single, testable seam for that flow. Extracted from
 * the React component so it can be exercised by an integration test that
 * uses a mock Supabase client and asserts:
 *   - the canonical edge-function invocation is the ONLY write path, and
 *   - the row is read back from `system.execution_tasks` (not
 *     `agent_tasks`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * What `trigger-github` returns on success — see
 * `supabase/functions/trigger-github/index.ts`.
 */
export interface TriggerGithubResponse {
  task_id?: string;
  status?: string;
  error?: string;
}

/**
 * Columns the Command Center reads back from `system.execution_tasks`.
 * Matches the `ExecutionTaskRow` shape in `DashboardCommandCenter.tsx`.
 */
export const COMMAND_CENTER_TASK_COLUMNS =
  "id,type,status,payload,execution_result,result,external_run_url,blocked_reason,error_code,error,requested_by,created_at,updated_at";

export type DispatchCommandCenterResult =
  | { ok: true; taskId: string; status: string; row: Record<string, unknown> | null }
  | { ok: false; error: string };

export async function dispatchCommandCenterPrompt(
  client: Pick<SupabaseClient, "functions" | "schema">,
  prompt: string,
): Promise<DispatchCommandCenterResult> {
  const trimmed = prompt.trim();
  if (!trimmed) return { ok: false, error: "prompt is empty" };

  // (1) canonical dispatch via the admin-gated Edge Function.
  const { data, error } = await client.functions.invoke<TriggerGithubResponse>(
    "trigger-github",
    { body: { prompt: trimmed } },
  );

  if (error || data?.error || !data?.task_id) {
    return {
      ok: false,
      error: data?.error ?? error?.message ?? "unknown dispatch error",
    };
  }

  // (2) immediate read-back from system.execution_tasks so the UI can
  //     render the new row before the realtime channel delivers INSERT.
  const { data: row } = await client
    .schema("system" as never)
    .from("execution_tasks" as never)
    .select(COMMAND_CENTER_TASK_COLUMNS)
    .eq("id", data.task_id)
    .maybeSingle();

  return {
    ok: true,
    taskId: data.task_id,
    status: data.status ?? "queued",
    row: (row ?? null) as Record<string, unknown> | null,
  };
}
