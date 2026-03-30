/**
 * executeEditMessage — Strict pipeline: intent → canonical → optimistic → transport → reconcile
 */
import type { EditMessageCommand } from "../orbit-commands";
import type { ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";

export async function executeEditMessage(
  cmd: EditMessageCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("editMessage");

  try {
    // ── Phase 1: Intent ──
    enterPhase(trace, "intent");
    const newBody = cmd.newBody?.trim();
    if (!newBody) return { ok: false, error: "empty_body", phase: "intent" };
    if (!cmd.messageId) return { ok: false, error: "no_message_id", phase: "intent" };
    exitPhase(trace);

    // ── Phase 2: Canonical ──
    enterPhase(trace, "canonical");
    // Edit is a simple body replacement — no metadata transform needed
    exitPhase(trace);

    // ── Phase 3: Optimistic ──
    enterPhase(trace, "optimistic");
    // Could update local store optimistically here in the future
    exitPhase(trace);

    // ── Phase 4: Transport ──
    enterPhase(trace, "transport");
    const { updateMessageFields } = await import("@/repositories/communication.repository");
    await updateMessageFields(cmd.messageId, { body: newBody });
    exitPhase(trace);

    // ── Phase 5: Reconcile ──
    enterPhase(trace, "reconcile");
    // Realtime will propagate the update
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true, messageId: cmd.messageId };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "edit_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
