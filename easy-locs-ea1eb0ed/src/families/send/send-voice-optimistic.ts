/**
 * send-voice-optimistic — Optimistic voice send pipeline.
 * 1. Insert optimistic message with local blob URL immediately
 * 2. Upload in background
 * 3. Reconcile with remote URL
 */
import { insertMessage, updateConversationTimestamp, updateMessageFields } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";
import { buildVoiceMeta } from "@/families/messages/build-metadata";
import { orbitLabels } from "@/families/orbit-i18n/orbit-labels";
import type { SendContext } from "./send-context";

export async function sendVoiceOptimistic(
  ctx: SendContext,
  opts: {
    blob: Blob;
    localUrl: string;
    durationSeconds: number;
    durationLabel: string;
    uploadFn: (blob: Blob, path: string) => Promise<string>;
    storagePath: string;
  },
): Promise<void> {
  const body = orbitLabels.message.voiceMessage(opts.durationLabel);
  const optimisticMeta = buildVoiceMeta(opts.localUrl, opts.durationSeconds);

  // Step 1: Insert optimistic message with local blob URL → visible immediately
  let messageData: any;
  try {
    messageData = await insertMessage({
      conversationId: ctx.conversationId,
      senderUserId: ctx.senderUserId,
      senderOrbitId: ctx.senderOrbitId,
      receiverOrbitId: ctx.receiverOrbitId,
      type: "voice",
      body,
      metadata: {
        ...optimisticMeta,
        transport: { source: "ui", optimistic: true },
      },
    });

    // Fire-and-forget timestamp update
    void updateConversationTimestamp(ctx.conversationId, body);

    platformBus.emit("orbit:message_sent", {
      conversationId: ctx.conversationId,
      type: "voice",
      optimistic: true,
    }, "orbit", { userId: ctx.senderUserId, orgId: ctx.orgId || undefined });
  } catch (err: any) {
    // If even the optimistic insert fails, nothing to reconcile
    throw err;
  }

  // Step 2: Upload in background
  try {
    const remoteUrl = await opts.uploadFn(opts.blob, opts.storagePath);
    if (!remoteUrl) throw new Error("Voice upload returned empty URL");

    // Step 3: Reconcile — update message with remote URL
    await updateMessageFields(messageData.id, {
      metadata: {
        ...optimisticMeta,
        media: {
          ...optimisticMeta.media,
          url: remoteUrl,
        },
        transport: { source: "ui", optimistic: false },
      },
    });

    platformBus.emit("orbit:voice_upload_completed", {
      messageId: messageData.id,
      conversationId: ctx.conversationId,
    }, "orbit", { userId: ctx.senderUserId });
  } catch (err: any) {
    // Mark message as failed but don't remove it
    try {
      await updateMessageFields(messageData.id, {
        metadata: {
          ...optimisticMeta,
          transport: { source: "ui", uploadFailed: true, error: err?.message },
        },
      });
    } catch {
      // best effort
    }
    throw err;
  }
}
