// LB Closeout #853 — Structured-error helper.
//
// Replaces the project-wide anti-pattern of `try { … } catch (_) {}`
// (silent swallow) with a single utility that:
//   • runs the side effect,
//   • on throw emits a structured `console.error` envelope with an
//     `event` namespace and any caller-supplied correlation fields
//     (e.g. task_id, agent_slug),
//   • returns either the value or `undefined` so the caller can keep
//     its current "best-effort" semantics.
//
// The envelope shape matches the rest of the audit pipeline (level,
// event, message, plus arbitrary context fields) so existing log
// consumers parse it without changes.

export interface StructuredErrorContext {
  /** Dot-separated event namespace, e.g. `engine_cron.supervisor_upsert_failed`. */
  event: string;
  /** Free-form context fields (task_id, agent_slug, entity_id, …). */
  [key: string]: unknown;
}

/** Emit a structured error log with a stable envelope. Exported so callers
 *  can also log directly when they don't have a try-block to wrap. */
export function emitStructuredError(
  ctx: StructuredErrorContext,
  err: unknown,
): void {
  const envelope = {
    level: "error" as const,
    ...ctx,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack ?? null : null,
  };
  // JSON.stringify so the audit pipeline (which scrapes stdout) gets a
  // single parseable line. Falls back to a plain string if the context
  // contains a circular reference.
  let line: string;
  try {
    line = JSON.stringify(envelope);
  } catch {
    line = `[structured-error] ${ctx.event}: ${envelope.message}`;
  }
  console.error(line);
}

/** Run `fn`; on throw, emit a structured error log and return `undefined`.
 *  Replaces `try { await fn() } catch (_) {}` with audit-traceable swallow. */
export async function runOrLog<T>(
  ctx: StructuredErrorContext,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    emitStructuredError(ctx, err);
    return undefined;
  }
}
