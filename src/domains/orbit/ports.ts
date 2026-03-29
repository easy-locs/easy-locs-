/**
 * Orbit Domain — Port interfaces (hexagonal architecture).
 * Communication hub: messaging, calls, presence, groups.
 */
import type { DomainResult } from "../shared/types";

// ── Aggregates ──
export interface Conversation {
  id: string;
  participants: string[];
  type: "direct" | "group";
  groupName?: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  encrypted: boolean;
  mediaUrl?: string;
  readBy: string[];
  createdAt: string;
}

export interface OrbitProfile {
  id: string;
  userId: string;
  orbitId: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
  online: boolean;
}

export interface CallSession {
  id: string;
  callerId: string;
  calleeId: string;
  isVideo: boolean;
  status: "ringing" | "active" | "ended" | "missed";
  startedAt?: string;
  endedAt?: string;
}

// ── Inbound Ports ──
export interface OrbitUseCases {
  sendMessage(cmd: SendMessageCommand): Promise<DomainResult<Message>>;
  getConversation(id: string): Promise<DomainResult<Conversation>>;
  listConversations(userId: string): Promise<DomainResult<Conversation[]>>;
  startCall(cmd: StartCallCommand): Promise<DomainResult<CallSession>>;
  endCall(callId: string, status: "ended" | "missed"): Promise<DomainResult<void>>;
  getProfile(userId: string): Promise<DomainResult<OrbitProfile>>;
}

export interface SendMessageCommand {
  conversationId: string;
  senderId: string;
  body: string;
  encrypted?: boolean;
  mediaUrl?: string;
}

export interface StartCallCommand {
  callerId: string;
  calleeId: string;
  isVideo: boolean;
}

// ── Outbound Ports ──
export interface ConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findByParticipant(userId: string): Promise<Conversation[]>;
  save(conversation: Conversation): Promise<void>;
}

export interface MessageRepository {
  findByConversation(conversationId: string, limit?: number): Promise<Message[]>;
  save(message: Message): Promise<void>;
  markRead(messageId: string, userId: string): Promise<void>;
}

export interface CallRepository {
  findById(id: string): Promise<CallSession | null>;
  save(session: CallSession): Promise<void>;
  updateStatus(id: string, status: CallSession["status"]): Promise<void>;
}

export interface OrbitProfileRepository {
  findByUserId(userId: string): Promise<OrbitProfile | null>;
  updatePresence(userId: string, online: boolean): Promise<void>;
}

export interface OrbitEventPort {
  messageSent(message: Message): void;
  callStarted(session: CallSession): void;
  callEnded(session: CallSession): void;
  presenceChanged(userId: string, online: boolean): void;
}

export interface EncryptionPort {
  encrypt(body: string, conversationId: string): Promise<string>;
  decrypt(cipher: string, conversationId: string): Promise<string>;
}
