/**
 * executeEditMessage — Strict pipeline: intent → optimistic → transport → reconcile
 * Now includes optimistic local update for instant feedback.
 */
import type { EditMessageCommand } from "../orbit-commands";
import type { ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";

export async function executeEditMessage(
  cmd: EditMessageCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("editMessage");

  try {
    enterPhase(trace, "intent");
    const newBody = cmd.newBody?.trim();
    if (!newBody) return { ok: false, error: "empty_body", phase: "intent" };
    if (!cmd.messageId) return { ok: false, error: "no_message_id", phase: "intent" };
    exitPhase(trace);

    // ── Optimistic: emit event for instant UI update ──
    enterPhase(trace, "optimistic");
    const { platformBus } = await import("@/lib/shared/platform-bus");
    platformBus.emit("orbit:message_edited_optimistic", {
      messageId: cmd.messageId,
      conversationId: cmd.conversationId,
      newBody,
    }, "orbit", {});
    exitPhase(trace);

    // ── Transport ──
    enterPhase(trace, "transport");
    const { updateMessageFields } = await import("@/repositories/communication.repository");
    await updateMessageFields(cmd.messageId, { body: newBody });
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true, messageId: cmd.messageId };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "edit_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
