/**
 * ORBIT CANONICAL ENTITIES — Single source of truth for all Orbit domain types.
 * NO other representation of these entities is tolerated.
 * Legacy payloads MUST be normalized into these shapes before store merge.
 */

// ══════════════════════════════════════════════
// 1. USER IDENTITY
// ══════════════════════════════════════════════

export interface OrbitUserIdentity {
  id: string;                   // auth.users UUID
  displayName: string | null;
  avatarUrl: string | null;
  orbitAlias?: string | null;   // orbit_xxx shorthand
  email?: string | null;
  phone?: string | null;
}

// ══════════════════════════════════════════════
// 2. CONTACT
// ══════════════════════════════════════════════

export interface OrbitContact {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: "active" | "inactive" | "blocked";
  blocked: boolean;
  isFavorite: boolean;
}

// ══════════════════════════════════════════════
// 3. CONVERSATION
// ══════════════════════════════════════════════

export type ConversationKind = "direct" | "group" | "support" | "ephemeral";

export interface OrbitConversation {
  id: string;
  kind: ConversationKind;
  participantIds: string[];       // user UUIDs
  title: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageId: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isArchived: boolean;
  isMuted: boolean;
  isEphemeral: boolean;
  ephemeralConfig: EphemeralConfig | null;
}

// ══════════════════════════════════════════════
// 4. PARTICIPANT
// ══════════════════════════════════════════════

export type ParticipantRole = "owner" | "admin" | "member" | "observer";

export interface OrbitParticipant {
  id: string;
  conversationId: string;
  userId: string;
  orbitId: string | null;
  role: ParticipantRole;
  joinedAt: string;
  leftAt: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

// ══════════════════════════════════════════════
// 5. MESSAGE
// ══════════════════════════════════════════════

export type MessageType =
  | "text" | "image" | "video" | "audio" | "voice"
  | "file" | "system" | "reply" | "reaction"
  | "call_event" | "ephemeral_notice"
  | "location_static" | "location_live"
  | "payment_request" | "payment_receipt";

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface OrbitMessage {
  id: string;
  tempId: string | null;
  conversationId: string;
  senderId: string;
  senderOrbitId: string | null;
  type: MessageType;
  text: string | null;
  attachmentIds: string[];
  replyToId: string | null;
  reactionSummary: Record<string, string[]> | null;  // emoji -> userId[]
  createdAt: string;
  updatedAt: string | null;
  status: MessageStatus;
  isDeleted: boolean;
  isEdited: boolean;
  metadata: Record<string, unknown>;
}

// ══════════════════════════════════════════════
// 6. ATTACHMENT
// ══════════════════════════════════════════════

export type AttachmentKind = "image" | "video" | "audio" | "voice" | "file" | "thumbnail";
export type AttachmentUploadStatus = "local" | "queued" | "uploading" | "uploaded" | "failed";

export interface OrbitAttachment {
  id: string;
  localId: string | null;
  messageId: string | null;
  conversationId: string;
  kind: AttachmentKind;
  localUri: string | null;
  remoteUrl: string | null;
  mimeType: string | null;
  size: number | null;
  duration: number | null;
  waveform: number[] | null;
  uploadStatus: AttachmentUploadStatus;
  uploadProgress: number;
  previewDataUrl: string | null;
}

// ══════════════════════════════════════════════
// 7. DRAFT
// ══════════════════════════════════════════════

export interface OrbitDraft {
  id: string;
  conversationId: string;
  text: string;
  attachments: OrbitDraftAttachment[];
  updatedAt: string;
}

export interface OrbitDraftAttachment {
  localId: string;
  file: File;
  previewUrl: string | null;
}

// ══════════════════════════════════════════════
// 8. RECEIPT
// ══════════════════════════════════════════════

export type ReceiptKind = "delivered" | "read";

export interface OrbitReceipt {
  id: string;
  messageId: string;
  userId: string;
  kind: ReceiptKind;
  createdAt: string;
}

// ══════════════════════════════════════════════
// 9. CALL SESSION
// ══════════════════════════════════════════════

export type CallMode = "audio" | "video";
export type CallSessionStatus =
  | "initiated" | "ringing" | "accepted" | "active"
  | "reconnecting" | "ended" | "missed" | "failed" | "declined";

export interface OrbitCallSession {
  id: string;
  conversationId: string | null;
  initiatorId: string;
  participantIds: string[];
  mode: CallMode;
  status: CallSessionStatus;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
}

// ══════════════════════════════════════════════
// 10. EPHEMERAL CONFIG
// ══════════════════════════════════════════════

export interface EphemeralConfig {
  conversationId: string;
  ttl: number;          // seconds
  enabled: boolean;
  applyToMedia: boolean;
  applyToText: boolean;
}

// ══════════════════════════════════════════════
// 11. LIFECYCLE ENUMS (for state machines)
// ══════════════════════════════════════════════

export type DraftLifecycle = "empty" | "dirty" | "saved" | "cleared";
export type EphemeralLifecycle = "created" | "active" | "expiring" | "expired" | "cleaned";
