/**
 * useScopedMessageAttachment — Reads the first attachment for a message
 * from orbitStore, scoped strictly by conversationId.
 *
 * RULE: Never reads global attachment map. Always scoped.
 */
import { useOrbitStore } from "@/domains/orbit/stores/orbit.store";
import type { OrbitAttachment } from "@/domains/orbit/types";

/**
 * Returns the primary attachment for a message, or null.
 * Scoped by conversationId to prevent cross-conversation leaks.
 */
export function useScopedMessageAttachment(
  conversationId: string | undefined,
  attachmentIds: string[] | null | undefined,
): OrbitAttachment | null {
  return useOrbitStore((s) => {
    if (!conversationId || !attachmentIds?.length) return null;
    const attId = attachmentIds[0];
    return s.getAttachmentScoped(conversationId, attId);
  });
}

/**
 * Non-hook version for use outside React components.
 */
export function getScopedMessageAttachment(
  conversationId: string,
  attachmentIds: string[] | null | undefined,
): OrbitAttachment | null {
  if (!attachmentIds?.length) return null;
  return useOrbitStore.getState().getAttachmentScoped(conversationId, attachmentIds[0]);
}
