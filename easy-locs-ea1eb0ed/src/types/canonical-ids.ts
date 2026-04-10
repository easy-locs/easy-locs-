/**
 * CANONICAL ID CONVENTIONS — Single source of truth for all naming.
 * 
 * This file documents and enforces the canonical naming convention
 * for all entity identifiers across the entire codebase.
 * 
 * RULES:
 * - `conversationId` — The UUID of a conversation (conversations_v2.id). 
 *   REPLACES: threadId, contextId (when referring to a conversation), v2ConversationId, chatId
 * 
 * - `senderUserId` — The UUID of the sending user (auth.users.id).
 *   REPLACES: senderId, sender_user_id (in TS code; DB columns keep snake_case)
 * 
 * - `senderOrbitId` — The Orbit communication identity string.
 *   REPLACES: sender_orbit_id (in TS code; DB columns keep snake_case)
 * 
 * - `entityId` — A business entity reference (listing, booking, deal, property, ride, order).
 *   REPLACES: contextId when it refers to a non-conversation business entity
 * 
 * - `entityType` — The type of business entity.
 *   REPLACES: contextType when it refers to a non-conversation context
 * 
 * DB MAPPING:
 *   TS `conversationId` ↔ DB `conversation_id`
 *   TS `senderUserId`   ↔ DB `sender_user_id`
 *   TS `senderOrbitId`  ↔ DB `sender_orbit_id`
 *   TS `entityId`       ↔ DB `context_id` (legacy) or `entity_id`
 *   TS `entityType`     ↔ DB `context_type` (legacy) or `entity_type`
 * 
 * TRANSITIONAL COMPAT:
 *   Use `mapLegacyIds()` below when reading from legacy sources.
 *   New code MUST NOT use legacy names.
 */

/** Map legacy field names to canonical names */
export function mapLegacyIds(source: Record<string, any>): {
  conversationId?: string;
  entityId?: string;
  entityType?: string;
  senderUserId?: string;
  senderOrbitId?: string;
} {
  return {
    conversationId:
      source.conversationId ||
      source.v2ConversationId ||
      source.conversation_id ||
      source.threadId ||
      source.thread_id ||
      undefined,
    entityId:
      source.entityId ||
      source.entity_id ||
      source.contextId ||
      source.context_id ||
      undefined,
    entityType:
      source.entityType ||
      source.entity_type ||
      source.contextType ||
      source.context_type ||
      undefined,
    senderUserId:
      source.senderUserId ||
      source.sender_user_id ||
      source.senderId ||
      undefined,
    senderOrbitId:
      source.senderOrbitId ||
      source.sender_orbit_id ||
      undefined,
  };
}

/** Type guard: ensure a value looks like a UUID */
export function isValidUUID(val: unknown): val is string {
  return typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}
