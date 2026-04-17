/**
 * Track 3 hardening (#843) — pure classifier for `system.execution_tasks`
 * poll-read errors. Lifted into its own module so unit tests can import it
 * without dragging in the Deno-only `https://esm.sh/...` Supabase client
 * pulled by `ai-dispatch.ts`.
 *
 * The fatal-code list is intentionally tight — anything outside is treated
 * as transient so a single flaky read never breaks a dispatch.
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
