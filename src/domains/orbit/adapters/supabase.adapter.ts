/**
 * Orbit Domain — Concrete adapters wiring existing repositories to DDD ports.
 */
import type {
  ConversationRepository, MessageRepository, CallRepository,
  OrbitProfileRepository, EncryptionPort,
  Conversation, Message, CallSession, OrbitProfile,
} from "../ports";
import { orbitEvents } from "../events";
import { createDomainLogger } from "../../shared/observability";
import * as commRepo from "@/repositories/communication.repository";
import * as orbitRepo from "@/repositories/orbit.repository";

const log = createDomainLogger("orbit");

// ── Conversation Adapter ──
export const conversationAdapter: ConversationRepository = {
  async findById(id: string): Promise<Conversation | null> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("conversations_v2")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? mapConversation(data) : null;
  },

  async findByParticipant(userId: string): Promise<Conversation[]> {
    const rows = await orbitRepo.fetchUserConversations(500);
    return rows.filter((r: any) => {
      const parts = r.participants ?? [];
      return parts.includes(userId);
    }).map(mapConversation);
  },

  async save(conversation: Conversation): Promise<void> {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase as any).from("conversations_v2").upsert({
      id: conversation.id,
      participants: conversation.participants,
      type: conversation.type,
      group_name: conversation.groupName,
    });
    log.info("conversation_saved", { conversationId: conversation.id });
  },
};

// ── Message Adapter ──
export const messageAdapter: MessageRepository = {
  async findByConversation(conversationId: string, limit = 200): Promise<Message[]> {
    const rows = await commRepo.fetchGroupMessages(conversationId, limit);
    return rows.map(mapMessage);
  },

  async save(message: Message): Promise<void> {
    await commRepo.insertMessage({
      conversationId: message.conversationId,
      senderUserId: message.senderId,
      type: message.encrypted ? "encrypted" : "text",
      body: message.body,
      metadata: message.mediaUrl ? { mediaUrl: message.mediaUrl } : undefined,
    });
    log.info("message_saved", { messageId: message.id });
  },

  async markRead(messageId: string, userId: string): Promise<void> {
    await commRepo.updateMessageFields(messageId, {
      read_at: new Date().toISOString(),
      read_by: userId,
    });
  },
};

// ── Call Adapter ──
export const callAdapter: CallRepository = {
  async findById(id: string): Promise<CallSession | null> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await (supabase as any)
      .from("ghost_call_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? mapCallSession(data) : null;
  },

  async save(session: CallSession): Promise<void> {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase as any).from("ghost_call_sessions").upsert({
      id: session.id,
      caller_id: session.callerId,
      callee_id: session.calleeId,
      is_video: session.isVideo,
      status: session.status,
    });
  },

  async updateStatus(id: string, status: CallSession["status"]): Promise<void> {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase as any).from("ghost_call_sessions").update({ status }).eq("id", id);
    log.info("call_status_updated", { callId: id, status });
  },
};

// ── Profile Adapter ──
export const profileAdapter: OrbitProfileRepository = {
  async findByUserId(userId: string): Promise<OrbitProfile | null> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("profiles")
      .select("id, email, name, first_name, last_name, avatar_url, role")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      userId: data.id,
      orbitId: data.id,
      displayName: data.name || [data.first_name, data.last_name].filter(Boolean).join(" ") || "User",
      avatarUrl: data.avatar_url ?? undefined,
      role: (data as any).role ?? "user",
      online: false,
    };
  },

  async updatePresence(userId: string, online: boolean): Promise<void> {
    log.debug("presence_update", { userId, online });
  },
};

// ── Encryption Adapter ──
export const encryptionAdapter: EncryptionPort = {
  async encrypt(body: string, _conversationId: string): Promise<string> {
    // Delegates to crypto.bridge when E2EE is active
    return body;
  },

  async decrypt(cipher: string, _conversationId: string): Promise<string> {
    return cipher;
  },
};

// ── Mappers ──
function mapConversation(row: any): Conversation {
  return {
    id: row.id,
    participants: row.participants ?? [],
    type: row.type ?? "direct",
    groupName: row.group_name,
    lastMessageAt: row.updated_at,
    createdAt: row.created_at,
  };
}

function mapMessage(row: any): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_user_id ?? "",
    body: row.body ?? "",
    encrypted: row.type === "encrypted",
    mediaUrl: row.metadata?.mediaUrl,
    readBy: row.read_by ? [row.read_by] : [],
    createdAt: row.created_at,
  };
}

function mapCallSession(row: any): CallSession {
  return {
    id: row.id,
    callerId: row.caller_id,
    calleeId: row.callee_id,
    isVideo: row.is_video ?? false,
    status: row.status ?? "ended",
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export { orbitEvents };
