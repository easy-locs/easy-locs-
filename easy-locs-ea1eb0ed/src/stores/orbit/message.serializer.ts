/**
 * orbit.message.serializer — Message formatting and serialization.
 * Pure functions, zero state, zero side effects.
 *
 * NOTE: buildMessagePreview delegates to canonical preview.resolver.
 */
import type { ChatMessageRecord } from "@/lib/types/comms";
import { buildMessagePreview as canonicalPreview } from "@/domains/orbit/resolvers/preview.resolver";

/** Serialize a raw DB row into a ChatMessageRecord */
export function serializeMessage(data: any): ChatMessageRecord {
  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderOrbitId: data.sender_orbit_id,
    senderUserId: data.sender_user_id,
    body: data.body,
    type: data.type || "text",
    metadata: data.metadata,
    createdAt: data.created_at,
  };
}

/** Build a message preview — delegates to canonical resolver */
export function buildMessagePreview(body: string, maxLen = 80): string {
  return canonicalPreview({ type: "text", text: body }, maxLen);
}

/** Sort messages by creation time ascending */
export function sortMessages(msgs: ChatMessageRecord[]): ChatMessageRecord[] {
  return [...msgs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
