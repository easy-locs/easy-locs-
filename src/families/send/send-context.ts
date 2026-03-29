/**
 * SendContext — Shared context type for all send subfamilies.
 * Every send function receives this to avoid prop-drilling.
 */

export interface SendContext {
  /** Canonical conversation UUID (conversations_v2.id) */
  conversationId: string;
  /** Auth user UUID of the sender */
  senderUserId: string;
  /** Orbit communication identity */
  senderOrbitId: string;
  /** Orbit identity of the receiver (for direct conversations) */
  receiverOrbitId?: string | null;
  /** Organization context (if applicable) */
  orgId?: string | null;

  // ── Deprecated aliases — DO NOT USE in new code ──
  /** @deprecated Use conversationId instead */
  threadId?: string;
}
