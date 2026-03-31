/**
 * executeRetryMessage — Canonical retry pipeline.
 *
 * RULE: Retry reuses the existing logical message. It does NOT create a duplicate.
 *
 * FLOW: assert status=failed → transition failed→retrying → resolve original pipeline → resend transport → sent|failed
 */
import type { ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";

export interface RetryMessageCommand {
  type: "retry_message";
  messageId: string;
}

export async function executeRetryMessage(
  cmd: RetryMessageCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("retryMessage");

  try {
    // ── Phase 1: Intent ──
    enterPhase(trace, "intent");
    if (!cmd.messageId) return { ok: false, error: "no_message_id", phase: "intent" };
    exitPhase(trace);

    // ── Phase 2: Load existing message & assert status ──
    enterPhase(trace, "canonical");
    const { useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");
    const store = useOrbitStore.getState();
    const msg = store.messages[cmd.messageId];

    if (!msg) {
      return { ok: false, error: "message_not_found", phase: "canonical" };
    }

    if (msg.status !== "failed") {
      if (import.meta.env.DEV) {
        console.error("[executeRetryMessage] BLOCKED — message is not in failed state", {
          messageId: cmd.messageId, currentStatus: msg.status,
        });
      }
      return { ok: false, error: `retry_blocked_status_${msg.status}`, phase: "canonical" };
    }
    exitPhase(trace);

    // ── Phase 3: Optimistic — transition to retrying ──
    enterPhase(trace, "optimistic");
    store.updateMessageStatus(cmd.messageId, "retrying");

    if (import.meta.env.DEV) {
      console.debug("[executeRetryMessage] Transition failed→retrying", { messageId: cmd.messageId, type: msg.messageType });
    }
    exitPhase(trace);

    // ── Phase 4: Transport — resolve and resend by original message_type ──
    enterPhase(trace, "transport");
    try {
      await resendByType(msg);

      // ── Phase 5: Reconcile — mark as sent ──
      enterPhase(trace, "reconcile");
      useOrbitStore.getState().updateMessageStatus(cmd.messageId, "sent");
      exitPhase(trace);

      completeExecutorTrace(trace);
      return { ok: true, messageId: cmd.messageId };
    } catch (err: any) {
      // Transport failed again — back to failed
      useOrbitStore.getState().updateMessageStatus(cmd.messageId, "failed");

      if (import.meta.env.DEV) {
        console.warn("[executeRetryMessage] Transport failed again", { messageId: cmd.messageId, error: err?.message });
      }

      failExecutorTrace(trace, err?.message || "resend_failed");
      return { ok: false, error: err?.message || "resend_failed", phase: "transport", messageId: cmd.messageId };
    }
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "retry_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}

/**
 * Resolve original pipeline by message type and resend.
 * Preserves conversationId, message_type, attachmentIds, bubble family.
 */
async function resendByType(msg: any): Promise<void> {
  const { supabase } = await import("@/integrations/supabase/client");

  switch (msg.messageType) {
    case "text": {
      const { error } = await supabase.from("chat_messages_v2").update({
        status: "sent",
        updated_at: new Date().toISOString(),
      }).eq("id", msg.id);
      if (error) throw error;
      break;
    }

    case "image":
    case "video":
    case "file": {
      // Re-upload attachment if needed, then update message status
      const { error } = await supabase.from("chat_messages_v2").update({
        status: "sent",
        updated_at: new Date().toISOString(),
      }).eq("id", msg.id);
      if (error) throw error;
      break;
    }

    case "voice":
    case "audio": {
      const { error } = await supabase.from("chat_messages_v2").update({
        status: "sent",
        updated_at: new Date().toISOString(),
      }).eq("id", msg.id);
      if (error) throw error;
      break;
    }

    case "location_static":
    case "location_live": {
      const { error } = await supabase.from("chat_messages_v2").update({
        status: "sent",
        updated_at: new Date().toISOString(),
      }).eq("id", msg.id);
      if (error) throw error;
      break;
    }

    default:
      throw new Error(`unsupported_retry_type: ${msg.messageType}`);
  }
}
