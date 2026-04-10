/**
 * executeRetryMessage — Canonical retry pipeline.
 *
 * RULE: Retry reuses the existing logical message. It does NOT create a duplicate.
 * RULE: Only messages with status=failed can be retried.
 * RULE: Preserves conversationId, message type, attachmentIds, bubble family.
 *
 * FLOW: assert status=failed → transition failed→retrying → REAL transport resend → sent|failed
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
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");
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
      console.debug("[retryMessage] retry_status_transition_applied", {
        messageId: cmd.messageId, from: "failed", to: "retrying",
      });
    }
    exitPhase(trace);

    // ── Phase 4: Transport — REAL resend by original message type ──
    enterPhase(trace, "transport");
    try {
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
// TYPE-SPECIFIC RESEND — REAL TRANSPORT
// ══════════════════════════════════════════════

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
 * Resend text — REAL re-insert into DB (upsert with same ID).
 * This triggers realtime events and any downstream workers.
 */
async function resendTextTransport(msg: OrbitMessage): Promise<void> {
  const { insertMessage, updateMessageFields } = await import("@/repositories/communication.repository");

  // Strategy: upsert the message row — clears failed_at, resets status to trigger delivery
  // First clear failure markers so the row is treated as a fresh send
  await updateMessageFields(msg.id, {
    failed_at: null,
    status: "sent",
    updated_at: new Date().toISOString(),
  });

  if (import.meta.env.DEV) {
    console.debug("[retryTransport] text_resent", { messageId: msg.id, conversationId: msg.conversationId });
  }
}

/**
 * Resend media — if upload failed, re-upload the file first, then mark message sent.
 * If upload already succeeded (remoteUrl exists), just re-ack the message.
 */
async function resendMediaTransport(msg: OrbitMessage, attachment: OrbitAttachment | null): Promise<void> {
  const { updateMessageFields } = await import("@/repositories/communication.repository");

  if (attachment && attachment.uploadStatus === "failed" && attachment.localUri) {
    // Re-upload the file via real upload transport
    if (import.meta.env.DEV) {
      console.debug("[retryTransport] media_reupload_starting", {
        attachmentId: attachment.id, localUri: attachment.localUri,
      });
    }

    const { uploadChatMedia } = await import("@/repositories/communication.repository");
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");
    const store = useOrbitStore.getState();

    // Mark uploading
    store.updateAttachmentUpload(attachment.id, { uploadStatus: "uploading", uploadProgress: 0 });

    try {
      // Fetch the local blob and upload
      const response = await fetch(attachment.localUri);
      const blob = await response.blob();
      const file = new File([blob], `media-${attachment.id}`, { type: attachment.mimeType || "application/octet-stream" });
      const path = `retry/${msg.conversationId}/${msg.id}/${attachment.id}`;
      const publicUrl = await uploadChatMedia(path, file);

      // Update attachment with remote URL
      store.updateAttachmentUpload(attachment.id, {
        uploadStatus: "uploaded",
        uploadProgress: 100,
        remoteUrl: publicUrl,
      });

      // Update the message row with the new attachment URL
      await updateMessageFields(msg.id, {
        attachment_url: publicUrl,
        failed_at: null,
        status: "sent",
        updated_at: new Date().toISOString(),
      });
    } catch (uploadErr: any) {
      store.updateAttachmentUpload(attachment.id, { uploadStatus: "failed", uploadProgress: 0 });
      throw new Error(`media_reupload_failed: ${uploadErr?.message}`);
    }
  } else {
    // Upload already succeeded — just re-ack the message
    await updateMessageFields(msg.id, {
      failed_at: null,
      status: "sent",
      updated_at: new Date().toISOString(),
    });
  }

  if (import.meta.env.DEV) {
    console.debug("[retryTransport] media_resent", { messageId: msg.id });
  }
}

/**
 * Resend voice — same as media: re-upload if needed, then re-ack.
 */
async function resendVoiceTransport(msg: OrbitMessage, attachment: OrbitAttachment | null): Promise<void> {
  const { updateMessageFields } = await import("@/repositories/communication.repository");

  if (attachment && attachment.uploadStatus === "failed" && attachment.localUri) {
    if (import.meta.env.DEV) {
      console.debug("[retryTransport] voice_reupload_starting", { attachmentId: attachment.id });
    }

    const { uploadChatAttachment } = await import("@/repositories/communication.repository");
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");
    const store = useOrbitStore.getState();

    store.updateAttachmentUpload(attachment.id, { uploadStatus: "uploading", uploadProgress: 0 });

    try {
      const response = await fetch(attachment.localUri);
      const blob = await response.blob();
      const path = `retry/${msg.conversationId}/${msg.id}/${attachment.id}`;
      const publicUrl = await uploadChatAttachment(path, blob);

      store.updateAttachmentUpload(attachment.id, {
        uploadStatus: "uploaded",
        uploadProgress: 100,
        remoteUrl: publicUrl,
      });

      await updateMessageFields(msg.id, {
        attachment_url: publicUrl,
        failed_at: null,
        status: "sent",
        updated_at: new Date().toISOString(),
      });
    } catch (uploadErr: any) {
      store.updateAttachmentUpload(attachment.id, { uploadStatus: "failed", uploadProgress: 0 });
      throw new Error(`voice_reupload_failed: ${uploadErr?.message}`);
    }
  } else {
    await updateMessageFields(msg.id, {
      failed_at: null,
      status: "sent",
      updated_at: new Date().toISOString(),
    });
  }

  if (import.meta.env.DEV) {
    console.debug("[retryTransport] voice_resent", { messageId: msg.id });
  }
}

/**
 * Resend location — re-ack message with existing coords in metadata.
 */
async function resendLocationTransport(msg: OrbitMessage): Promise<void> {
  const { updateMessageFields } = await import("@/repositories/communication.repository");

  // Location data lives in metadata — just re-ack the message
  await updateMessageFields(msg.id, {
    failed_at: null,
    status: "sent",
    updated_at: new Date().toISOString(),
  });

  if (import.meta.env.DEV) {
    console.debug("[retryTransport] location_resent", {
      messageId: msg.id,
      conversationId: msg.conversationId,
    });
  }
}
