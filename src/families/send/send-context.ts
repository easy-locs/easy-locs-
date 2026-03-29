/**
 * SendContext — Shared context type for all send subfamilies.
 * Every send function receives this to avoid prop-drilling.
 */

export interface SendContext {
  conversationId: string;
  senderUserId: string;
  senderOrbitId: string;
  receiverOrbitId?: string | null;
  threadId?: string;
  orgId?: string | null;
}
