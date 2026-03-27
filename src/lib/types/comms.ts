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

export type ConversationType = "direct" | "group" | "support" | "system" | "booking" | "property_management";

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "location"
  | "system"
  | "call_log";

export type CallType = "audio" | "video";

export type CallStatus =
  | "ringing"
  | "answered"
  | "missed"
  | "ended"
  | "failed";

export type CallDirection = "incoming" | "outgoing";

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
  phone?: string | null;
};

// ═══════════════════════════════════════════════════
// PARTICIPANTS — Canonical JSONB shape stored in conversations_v2.participants
// ═══════════════════════════════════════════════════

export interface ConversationParticipant {
  orbitId?: string | null;
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  joinedAt?: string | null;
  isAdmin?: boolean;
}

// ═══════════════════════════════════════════════════
// CONVERSATIONS — DB row shape from conversations_v2
// ═══════════════════════════════════════════════════

export interface ConversationRow {
  id: string;
  type: ConversationType;
  participants: ConversationParticipant[] | null;
  title: string | null;
  created_by_orbit_id?: string | null;
  listing_id: string | null;
  booking_id: string | null;
  lease_id: string | null;
  context_type?: string | null;
  context_id?: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count_cache: number | null;
  archived: boolean | null;
  muted: boolean | null;
  ghost_mode: boolean | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════
// MESSAGES — DB row shape from chat_messages_v2
// ═══════════════════════════════════════════════════

export interface ChatMessageRow {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_orbit_id: string | null;
  receiver_orbit_id?: string | null;
  type: MessageType;
  body: string;
  attachments: unknown[] | null;
  reactions: unknown[] | null;
  reply_to_message_id: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  deleted_at: string | null;
  edited_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

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

export interface ConversationRecord {
  id: string;
  type: ConversationType;
  participants: ConversationParticipant[];
  title?: string | null;
  listingId?: string | null;
  bookingId?: string | null;
  leaseId?: string | null;
  contextType?: string | null;
  contextId?: string | null;
  lastMessageAt: string;
  lastMessagePreview?: string | null;
  unreadCountCache?: number;
  archived?: boolean;
  muted?: boolean;
  ghostMode?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  senderUserId?: string | null;
  senderOrbitId?: string | null;
  type: MessageType;
  body: string;
  attachments?: unknown[];
  reactions?: unknown[];
  replyToMessageId?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  failedAt?: string | null;
  deletedAt?: string | null;
  editedAt?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
