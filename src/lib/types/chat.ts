export type ConversationType =
  | "direct"
  | "booking"
  | "property_management";

export type MessageType =
  | "text"
  | "system"
  | "payment"
  | "booking"
  | "call";

export interface ConversationParticipant {
  orbitId: string;
  role?: "buyer" | "seller" | "owner" | "tenant" | "guest" | "manager";
}

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

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  senderOrbitId: string;
  type: MessageType;
  body: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
