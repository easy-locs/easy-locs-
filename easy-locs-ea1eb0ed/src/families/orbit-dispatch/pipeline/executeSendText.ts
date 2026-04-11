/**
 * executeSendText — Strict pipeline: intent → optimistic STORE INSERT → background DB → reconcile
 *
 * FLOW: intent → canonical → store insert (INSTANT) → DB persist → broadcast → reconcile
 * The text bubble appears at T0+0ms. Network happens after.
 * E2EE is opt-in: only encrypts when cmd.encrypted is true and a ratchet session exists.
 */
import type { SendTextCommand } from "../orbit-commands";
import type { ResolvedContext, ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";
import { useOrbitMessagingStore } from "@/domains/orbit/stores/orbit.store";
import { buildTextMeta } from "@/families/messages/build-metadata";
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import { broadcastInstantMessage } from "@/lib/realtime-broadcast";
import { platformBus } from "@/lib/shared/platform-bus";
import {
  buildOptimisticTextMessage,
  validateTextInput,
  type SendTextInput,
} from "@/domains/orbit/pipelines/message/send-text.pipeline";
import { encryptMessageBody } from "@/stores/orbit/crypto.bridge";

export async function executeSendText(
  ctx: ResolvedContext,
  cmd: SendTextCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("sendText");

  try {
    // ── Phase 1: Intent ──
    enterPhase(trace, "intent");
    const body = cmd.body?.trim();
    if (!body) return { ok: false, error: "empty_body", phase: "intent" };
    if (!ctx.conversationId) return { ok: false, error: "no_conversation", phase: "intent" };

    const input: SendTextInput = {
      conversationId: ctx.conversationId,
      senderId: ctx.senderUserId,
      senderOrbitId: ctx.senderOrbitId,
      body,
      replyToId: cmd.replyToMessageId,
      encrypted: cmd.encrypted,
    };

    const validationError = validateTextInput(input);
    if (validationError) return { ok: false, error: validationError, phase: "intent" };
    exitPhase(trace);

    // ── Phase 2: Canonical metadata ──
    enterPhase(trace, "canonical");
    const baseMeta = buildTextMeta({
      encrypted: cmd.encrypted,
      category: cmd.category,
      locale: cmd.locale,
    });
    exitPhase(trace);

    // ── Phase 3: INSTANT STORE INSERT — bubble visible NOW (T0+0ms) ──
    enterPhase(trace, "instant_insert");
    const optimistic = buildOptimisticTextMessage(input);
    const store = useOrbitMessagingStore.getState();
    store.mergeMessage(optimistic);
    const tempId = optimistic.tempId ?? optimistic.id;
    const uiTempId = cmd._uiTempId ?? tempId;
    const metadata = { ...baseMeta, _tempId: uiTempId };

    if (import.meta.env.DEV) {
      console.debug("[executeSendText] Optimistic text merged", {
        tempId, conversationId: ctx.conversationId, bodyLen: body.length,
      });
    }
    exitPhase(trace);

    // ── Phase 4: Background DB persist + broadcast (non-blocking) ──
    enterPhase(trace, "background_transport");
    void (async () => {
      try {
        let wireBody = body;
        let wireMeta = metadata;

        if (cmd.encrypted) {
          try {
            const ratchetMsg = await encryptMessageBody(ctx.conversationId, body);
            wireBody = JSON.stringify(ratchetMsg);
            wireMeta = { ...metadata, e2ee: true, e2ee_v: 3 };
          } catch (encErr: any) {
            if (import.meta.env.DEV) {
              console.warn("[executeSendText] E2EE encrypt failed, sending plaintext:", encErr?.message);
            }
          }
        }

        let disappearAt: string | null = null;
        if (cmd.disappearTTL && cmd.disappearTTL !== "off") {
          const { EphemeralPolicy } = await import("@/families/ephemeral/ephemeral-policy");
          disappearAt = EphemeralPolicy.computeDisappearAt(new Date(), cmd.disappearTTL as any);
        }

        const data = await insertMessage({
          conversationId: ctx.conversationId,
          senderUserId: ctx.senderUserId,
          senderOrbitId: ctx.senderOrbitId,
          receiverOrbitId: ctx.receiverOrbitId,
          type: "text",
          body: wireBody,
          replyToMessageId: cmd.replyToMessageId,
          metadata: wireMeta,
          ...(disappearAt ? { disappear_at: disappearAt } : {}),
        });

        // Reconcile: tempId → serverId
        const serverId = data?.id;
        if (serverId && serverId !== tempId) {
          store.reconcileMessage(tempId, { ...optimistic, id: serverId, status: "sent" });
        } else {
          store.updateMessageStatus(tempId, "sent");
        }

        // Sub-50ms peer broadcast
        broadcastInstantMessage(ctx.conversationId, {
          id: serverId || tempId,
          conversationId: ctx.conversationId,
          senderUserId: ctx.senderUserId,
          senderOrbitId: ctx.senderOrbitId,
          type: "text",
          body: wireBody,
          metadata: data?.metadata || wireMeta,
          createdAt: data?.created_at || optimistic.createdAt,
          confirmed: true,
        });

        // Fire-and-forget: timestamp + domain event
        void updateConversationTimestamp(ctx.conversationId, body.slice(0, 120)).catch(() => {});
        platformBus.emit("orbit:message_sent", {
          conversationId: ctx.conversationId,
          type: "text",
        }, "orbit", { userId: ctx.senderUserId, orgId: ctx.orgId || undefined });
      } catch (err: any) {
        // Mark as failed in store so user can retry
        store.updateMessageStatus(tempId, "failed" as any);
        console.error("[executeSendText] Background persist failed:", err?.message);
      }
    })();
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true, messageId: tempId };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "send_text_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
