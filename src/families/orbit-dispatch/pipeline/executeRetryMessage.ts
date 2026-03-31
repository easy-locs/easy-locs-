/**
 * executeRetryMessage — Canonical retry pipeline.
 *
 * RULE: Retry reuses the existing logical message. It does NOT create a duplicate.
 * RULE: Only messages with status=failed can be retried.
 * RULE: Preserves conversationId, message type, attachmentIds, bubble family.
 *
 * FLOW: assert status=failed → transition failed→retrying → resolve original pipeline → resend transport → sent|failed
 */
import type { ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";
import type { OrbitMessage, OrbitAttachment } from "@/domains/orbit/types";

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
      if (import.meta.env.DEV) {
        console.error("[retryMessage] retry_blocked — message_not_found", { messageId: cmd.messageId });
      }
      return { ok: false, error: "message_not_found", phase: "canonical" };
    }

    if (msg.status !== "failed") {
      if (import.meta.env.DEV) {
        console.error("[retryMessage] retry_blocked_invalid_status", {
          messageId: cmd.messageId, currentStatus: msg.status,
        });
      }
      return { ok: false, error: `retry_blocked_status_${msg.status}`, phase: "canonical" };
    }

    if (import.meta.env.DEV) {
      console.debug("[retryMessage] retry_requested", {
        messageId: cmd.messageId, type: msg.type, conversationId: msg.conversationId,
      });
    }
    exitPhase(trace);

    // ── Phase 3: Optimistic — transition failed → retrying via status machine ──
    enterPhase(trace, "optimistic");
    store.updateMessageStatus(cmd.messageId, "retrying");

    if (import.meta.env.DEV) {
      console.debug("[retryMessage] status_transition", {
        messageId: cmd.messageId, from: "failed", to: "retrying",
      });
    }
    exitPhase(trace);

    // ── Phase 4: Transport — resolve and resend by original message type ──
    enterPhase(trace, "transport");
    try {
      // Gather attachments if media/voice
      const attachments = msg.attachmentIds
        .map(id => store.attachments[id])
        .filter(Boolean) as OrbitAttachment[];

      await resendByType(msg, attachments);

      if (import.meta.env.DEV) {
        console.debug("[retryMessage] retry_pipeline_resolved", { messageId: cmd.messageId, type: msg.type });
      }
      exitPhase(trace);

      // ── Phase 5: Reconcile — retrying → sent ──
      enterPhase(trace, "reconcile");
      useOrbitStore.getState().updateMessageStatus(cmd.messageId, "sent");

      if (import.meta.env.DEV) {
        console.debug("[retryMessage] retry_success", { messageId: cmd.messageId });
      }
      exitPhase(trace);

      completeExecutorTrace(trace);
      return { ok: true, messageId: cmd.messageId };
    } catch (err: any) {
      // Transport failed again — retrying → failed
      useOrbitStore.getState().updateMessageStatus(cmd.messageId, "failed");

      if (import.meta.env.DEV) {
        console.warn("[retryMessage] retry_failed", {
          messageId: cmd.messageId, error: err?.message,
        });
      }

      failExecutorTrace(trace, err?.message || "resend_failed");
      return { ok: false, error: err?.message || "resend_failed", phase: "transport", messageId: cmd.messageId };
    }
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "retry_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}

// ══════════════════════════════════════════════
// TYPE-SPECIFIC RESEND HELPERS
// ══════════════════════════════════════════════

/**
 * Dispatch to the correct resend helper based on message type.
 */
async function resendByType(msg: OrbitMessage, attachments: OrbitAttachment[]): Promise<void> {
  switch (msg.type) {
    case "text":
      return resendTextTransport(msg);
    case "image":
    case "video":
    case "file":
      return resendMediaTransport(msg, attachments[0] || null);
    case "voice":
    case "audio":
      return resendVoiceTransport(msg, attachments[0] || null);
    case "location_static":
    case "location_live":
      return resendLocationTransport(msg);
    default:
      throw new Error(`unsupported_retry_type: ${msg.type}`);
  }
}

/**
 * Resend text — simply clear failed_at and update timestamp to trigger re-delivery.
 */
async function resendTextTransport(msg: OrbitMessage): Promise<void> {
  const { updateMessageFields } = await import("@/repositories/communication.repository");
  await updateMessageFields(msg.id, {
    failed_at: null,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Resend media — if remoteUrl already exists, just clear failed state.
 * If upload was incomplete, the attachment still has localUri to re-upload.
 */
async function resendMediaTransport(msg: OrbitMessage, attachment: OrbitAttachment | null): Promise<void> {
  const { updateMessageFields } = await import("@/repositories/communication.repository");

  if (attachment && attachment.uploadStatus === "failed" && attachment.localUri) {
    // Re-upload needed — update attachment status to queued so upload pipeline picks it up
    const { useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");
    useOrbitStore.getState().updateAttachmentUpload(attachment.id, {
      uploadStatus: "queued",
      uploadProgress: 0,
    });
  }

  await updateMessageFields(msg.id, {
    failed_at: null,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Resend voice — same logic as media. Voice blob may already be uploaded.
 */
async function resendVoiceTransport(msg: OrbitMessage, attachment: OrbitAttachment | null): Promise<void> {
  const { updateMessageFields } = await import("@/repositories/communication.repository");

  if (attachment && attachment.uploadStatus === "failed" && attachment.localUri) {
    const { useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");
    useOrbitStore.getState().updateAttachmentUpload(attachment.id, {
      uploadStatus: "queued",
      uploadProgress: 0,
    });
  }

  await updateMessageFields(msg.id, {
    failed_at: null,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Resend location — coordinates are already embedded in metadata, just resend.
 */
async function resendLocationTransport(msg: OrbitMessage): Promise<void> {
  const { updateMessageFields } = await import("@/repositories/communication.repository");
  await updateMessageFields(msg.id, {
    failed_at: null,
    updated_at: new Date().toISOString(),
  });
}
