/**
 * comms.ts — CANONICAL SINGLE SOURCE OF TRUTH for all Orbit communication types.
 *
 * EVERY module that needs conversation, message, call, or participant types
 * MUST import from here. No other file may define parallel types.
 *
 * DB tables:
 *   - conversations_v2      → ConversationRow
 *   - chat_messages_v2      → ChatMessageRow
 *   - call_sessions          → CallSessionRow
 *   - call_logs              → CallLogRow
 *   - orbit_profiles_v2      → OrbitProfileRow
 */

// ═══════════════════════════════════════════════════
// TAXONOMY — Conversation & Message types
// ═══════════════════════════════════════════════════

export type ConversationType =
  | "direct"
  | "booking"
  | "property_management"
  | "group"
  | "support";

export type MessageType =
  | "text"
  | "image"
  | "file"
  | "call"
  | "system"
  | "location"
  | "payment"
  | "booking";

export type CallType = "audio" | "video";

export type CallStatus =
  | "ringing"
  | "accepted"
  | "rejected"
  | "ended"
  | "missed";

export type CallDirection = "outgoing" | "incoming";

export type CallLogStatus =
  | "missed"
  | "answered"
  | "rejected"
  | "ended"
  | "cancelled";

// ═══════════════════════════════════════════════════
// IDENTITY — Orbit profile (DB row shape)
// ═══════════════════════════════════════════════════

export type OrbitProfileRow = {
  id: string;
  orbit_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

// ═══════════════════════════════════════════════════
// PARTICIPANTS — Canonical JSONB shape stored in conversations_v2.participants
// ═══════════════════════════════════════════════════

/**
 * Canonical participant object stored in conversations_v2.participants JSONB.
 * This is the ONLY valid shape. All conversation creation must use this format.
 *
 * Required: orbitId
 * Optional: userId, email, displayName
 */
export type ConversationParticipant = {
  orbitId: string;
  userId?: string | null;
  email?: string | null;
  displayName?: string | null;
  /** Business role context (optional — for booking/lease threads) */
  role?: "buyer" | "seller" | "owner" | "tenant" | "guest" | "manager";
};

// ═══════════════════════════════════════════════════
// CONVERSATIONS — DB row shape from conversations_v2
// ═══════════════════════════════════════════════════

export type ConversationRow = {
  id: string;
  type: string | null;
  title: string | null;
  created_by_orbit_id: string | null;
  participants: ConversationParticipant[];
  listing_id: string | null;
  booking_id: string | null;
  lease_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

// ═══════════════════════════════════════════════════
// MESSAGES — DB row shape from chat_messages_v2
// ═══════════════════════════════════════════════════

export type ChatMessageRow = {
  id: string;
  conversation_id: string;
  sender_orbit_id: string | null;
  sender_user_id: string | null;
  receiver_orbit_id: string | null;
  type: MessageType;
  body: string;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

// ═══════════════════════════════════════════════════
// CALLS — DB row shapes
// ═══════════════════════════════════════════════════

export type CallSessionRow = {
  id: string;
  conversation_id: string | null;
  caller_orbit_id: string;
  receiver_orbit_id: string;
  call_type: CallType;
  status: CallStatus;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CallLogRow = {
  id: string;
  conversation_id: string;
  session_id: string | null;
  caller_orbit_id: string;
  receiver_orbit_id: string;
  call_type: CallType;
  direction: CallDirection;
  status: CallLogStatus;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_sec: number;
  created_at: string;
};

// ═══════════════════════════════════════════════════
// DOMAIN RECORDS — Camel-case mapped types for stores/services
// ═══════════════════════════════════════════════════

/**
 * Domain-level conversation record (camelCase).
 * Used by chatStore, chatRepoExtended, and service layers.
 */
export interface ConversationRecord {
  id: string;
  type: ConversationType;
  participants: ConversationParticipant[];
  title?: string;
  listingId?: string;
  bookingId?: string;
  leaseId?: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Domain-level chat message record (camelCase).
 * Used by chatStore and service layers.
 */
export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  senderOrbitId: string;
  type: MessageType;
  body: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
