/**
 * sendSystemMessage — Canonical system message sender.
 * Delegates to the canonical send.system-event family.
 * Kept as a thin wrapper for backward compatibility with existing callers.
 */
import { sendSystemEvent } from "@/families/send/send-system-event";
import type { SendContext } from "@/families/send/send-context";

export async function sendSystemMessage(params: {
  conversationId: string;
  senderUserId: string;
  senderOrbitId?: string | null;
  body: string;
  metadata?: Record<string, unknown> | null;
}) {
  const ctx: SendContext = {
    conversationId: params.conversationId,
    senderUserId: params.senderUserId,
    senderOrbitId: params.senderOrbitId || `orbit_${params.senderUserId.slice(0, 12)}`,
  };

  return sendSystemEvent(ctx, "system", params.body, (params.metadata as Record<string, unknown>) || undefined);
}
