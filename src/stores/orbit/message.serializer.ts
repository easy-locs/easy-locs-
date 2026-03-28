/**
 * orbit.message.serializer — Message formatting and serialization.
 * Pure functions, zero state, zero side effects.
 */
import type { ChatMessageRecord } from "@/lib/types/comms";

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

/** Build a message preview for conversation list */
export function buildMessagePreview(body: string, maxLen = 80): string {
  if (!body) return "";
  if (body.startsWith("e2e-file:")) return "📎 Encrypted file";
  return body.length > maxLen ? body.slice(0, maxLen) + "…" : body;
}

/** Sort messages by creation time ascending */
export function sortMessages(msgs: ChatMessageRecord[]): ChatMessageRecord[] {
  return [...msgs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
