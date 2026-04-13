/**
 * Orbit Canonical Services — Thin dispatch wrappers over orbitDispatch.
 *
 * ALL send operations route through the canonical orbitDispatch pipeline:
 *   sendTextMessage → orbitDispatch({ type: "send_text", ... })
 *
 * For media/voice sends, callers must use orbitDispatch directly since they
 * require caller-provided uploadFn and pathPrefix (see orbit-commands.ts).
 *
 * Non-send helpers (createDirectConversation, reconcileServerMessage,
 * transitionMessageStatus, markConversationRead) remain here as they do
 * not overlap with the dispatch pipeline.
 */
import type {
  OrbitMessage,
  MessageStatus,
} from "@/domains/orbit/types";
import { useOrbitMessagingStore } from "@/domains/orbit/stores/orbit.store";
import { orbitDispatch } from "@/families/orbit-dispatch/orbit-dispatch";
import { findOrCreateDirect } from "@/domains/orbit/pipelines/conversation/find-or-create-direct.pipeline";
import { logMessageReconciled } from "@/lib/observability/orbit-observability";
import { isFlowActive, enterFlow, exitFlow } from "@/domains/orbit/flow-gate/orbit-flow-gate";

// ══════════════════════════════════════════════
// TEXT MESSAGE — Routes through orbitDispatch
// ══════════════════════════════════════════════

export async function sendTextMessage(input: {
  conversationId: string;
  senderId: string;
  senderOrbitId: string;
  text: string;
  replyToId?: string | null;
}): Promise<{ ok: boolean; tempId?: string; error?: string }> {
  const result = await orbitDispatch({
    type: "send_text",
    conversationId: input.conversationId,
    body: input.text,
    replyToMessageId: input.replyToId ?? null,
  });
  return { ok: result.ok, tempId: result.messageId, error: result.error };
}

// ══════════════════════════════════════════════
// CREATE DIRECT CONVERSATION — Flow-gated
// ══════════════════════════════════════════════

export async function createDirectConversation(input: {
  myUserId: string;
  peerUserId: string;
  searchFn: (pair: string[]) => Promise<any | null>;
  createFn: (pair: string[]) => Promise<any>;
}): Promise<{ ok: boolean; conversation?: any; error?: string }> {
  const pairKey = [input.myUserId, input.peerUserId].sort().join("::");
  const flowKey = `service.conversation.openDirect:${pairKey}`;
  if (isFlowActive(flowKey)) return { ok: false, error: "flow_active" };

  enterFlow(flowKey);
  try {
    const result = await findOrCreateDirect(
      input.myUserId,
      input.peerUserId,
      input.searchFn,
      input.createFn,
    );
    return { ok: true, conversation: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  } finally {
    exitFlow(flowKey);
  }
}

// ══════════════════════════════════════════════
// MARK READ — delegates to store
// ══════════════════════════════════════════════

export function markConversationRead(conversationId: string): void {
  useOrbitMessagingStore.getState().updateUnreadCount(conversationId, 0);
}

// ══════════════════════════════════════════════
// RECONCILE (called by realtime/transport on ack)
// ══════════════════════════════════════════════

export function reconcileServerMessage(tempId: string, serverMsg: OrbitMessage): void {
  useOrbitMessagingStore.getState().reconcileMessage(tempId, serverMsg);
  logMessageReconciled(tempId, serverMsg.id);
}

// ══════════════════════════════════════════════
// UPDATE MESSAGE STATUS
// ══════════════════════════════════════════════

export function transitionMessageStatus(messageId: string, status: MessageStatus): void {
  useOrbitMessagingStore.getState().updateMessageStatus(messageId, status);
}
