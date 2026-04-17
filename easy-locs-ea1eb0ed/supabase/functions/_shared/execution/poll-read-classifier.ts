/**
 * Track 3 hardening (#843) — pure classifier + structured-log helpers
 * for `system.execution_tasks` poll-read errors. Lifted into its own
 * module so unit tests can import it without dragging in the Deno-only
 * `https://esm.sh/...` Supabase client pulled by `ai-dispatch.ts`.
 *
 * The fatal-code list is intentionally tight — anything outside is treated
 * as transient so a single flaky read never breaks a dispatch.
 *
 * Every emitted log includes the canonical context the platform's audit
 * pipeline needs to correlate failures back to a specific run:
 * `task_id` (always) and `agent_slug` (when the caller has it).
 */

const FATAL_POLL_READ_CODES: ReadonlySet<string> = new Set([
  "42501",   // insufficient_privilege (RLS denial)
  "42P01",   // undefined_table
  "42703",   // undefined_column
  "42883",   // undefined_function
  "PGRST301", // postgrest: jwt_invalid
  "PGRST302", // postgrest: jwt expired
]);

export function classifyPollReadError(
  code: string | null | undefined,
): "fatal" | "transient" {
  if (code && FATAL_POLL_READ_CODES.has(code)) return "fatal";
  return "transient";
}

export interface PollReadErrorInput {
  taskId: string;
  /** Agent slug from the dispatch context — null when the caller has none. */
  agentSlug?: string | null;
  code: string | null | undefined;
  message: string;
}

export interface PollReadErrorRecord {
  event: "ai_dispatch.poll_read_error";
  level: "error";
  task_id: string;
  agent_slug: string | null;
  code: string | null;
  message: string;
  severity: "fatal" | "transient";
}

export function buildPollReadErrorRecord(
  input: PollReadErrorInput,
): PollReadErrorRecord {
  return {
    event: "ai_dispatch.poll_read_error",
    level: "error",
    task_id: input.taskId,
    agent_slug: input.agentSlug ?? null,
    code: input.code ?? null,
    message: input.message,
    severity: classifyPollReadError(input.code),
  };
}

/**
 * Handle a poll-read error end-to-end: emit the canonical structured log
 * line via `console.error` (the platform's log scraper picks it up by
 * `event` name) and throw if the classifier says the error is fatal.
 *
 * Returns the record on success so callers can assert on it from tests.
 */
export function handlePollReadError(
  input: PollReadErrorInput,
): PollReadErrorRecord {
  const record = buildPollReadErrorRecord(input);
  console.error(JSON.stringify(record));
  if (record.severity === "fatal") {
    throw new Error(
      `[ai-dispatch] fatal poll read error (code=${record.code ?? "null"}, task=${input.taskId}): ${input.message}`,
    );
  }
  return record;
}
