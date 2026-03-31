/**
 * Orbit ID Resolvers — Central ID resolution layer.
 * Converts any legacy/mixed ID format to canonical form.
 * All flows MUST pass through these before store merge.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORBIT_PREFIX = "orbit_";

/**
 * Resolve to canonical user UUID.
 * Handles: raw UUID, orbit_xxx alias, profile ID.
 */
export function resolveCanonicalUserId(input: string | null | undefined): string | null {
  if (!input) return null;
  // If orbit_ prefixed, extract the underlying part (not guaranteed UUID)
  if (input.startsWith(ORBIT_PREFIX)) {
    return input; // Keep orbit alias as-is; callers use it for routing
  }
  if (UUID_RE.test(input)) return input;
  return input; // Fallback: accept as-is
}

/**
 * Resolve to canonical conversation UUID.
 * Handles: conversations_v2.id, threadId, v2ConversationId, chatId.
 */
export function resolveCanonicalConversationId(
  source: Record<string, any>,
): string | null {
  return (
    source.conversationId ||
    source.conversation_id ||
    source.v2ConversationId ||
    source.threadId ||
    source.thread_id ||
    source.chatId ||
    source.chat_id ||
    source.id ||
    null
  );
}

/**
 * Resolve canonical message ID.
 */
export function resolveCanonicalMessageId(
  source: Record<string, any>,
): string | null {
  return source.id || source.messageId || source.message_id || null;
}

/**
 * Resolve canonical participant ID from mixed format.
 */
export function resolveCanonicalParticipantId(participant: any): string | null {
  if (typeof participant === "string") return participant;
  if (!participant) return null;
  return (
    participant.userId ||
    participant.user_id ||
    participant.orbitId ||
    participant.orbit_id ||
    participant.id ||
    null
  );
}

/**
 * Resolve canonical attachment ID.
 */
export function resolveCanonicalAttachmentId(
  source: Record<string, any>,
): string | null {
  return source.id || source.attachmentId || source.localId || source.local_id || null;
}

/**
 * Check if a string is a valid UUID.
 */
export function isValidOrbitUUID(val: unknown): val is string {
  return typeof val === "string" && UUID_RE.test(val);
}

/**
 * Build orbit alias from user UUID.
 */
export function buildOrbitAlias(userId: string): string {
  return `${ORBIT_PREFIX}${userId.slice(0, 12)}`;
}
