/**
 * conversation-resolver — Atomic unit: resolve or auto-create a v2ConversationId.
 * Single responsibility: given a thread, return a guaranteed conversationId or throw.
 */
import { supabase } from "@/integrations/supabase/client";
import { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[CONVERSATION_RESOLVE][${step}] ${phase}:`, payload ?? {});
};

interface ResolveInput {
  threadId: string;
  v2ConversationId?: string | null;
  contextId?: string | null;
  threadDbId?: string | null;
  peerUserId?: string | null;
  peerOrbitId?: string | null;
  myUserId: string;
  myOrbitId?: string | null;
}

interface ResolveResult {
  conversationId: string;
  wasCreated: boolean;
}

export async function resolveConversationId(input: ResolveInput): Promise<ResolveResult> {
  trace("resolve", "input", {
    threadId: input.threadId,
    v2ConversationId: input.v2ConversationId ?? null,
    contextId: input.contextId ?? null,
    peerUserId: input.peerUserId ?? null,
  });

  // Strategy 1: Already have it
  if (input.v2ConversationId) {
    trace("resolve", "output", { strategy: "existing", conversationId: input.v2ConversationId });
    return { conversationId: input.v2ConversationId, wasCreated: false };
  }

  // Strategy 2: contextId matches a conversation
  if (input.contextId) {
    trace("resolve.contextId", "input", { candidate: input.contextId });
    const { data } = await (supabase as any)
      .from("conversations_v2").select("id").eq("id", input.contextId).maybeSingle();
    if (data?.id) {
      trace("resolve.contextId", "output", { conversationId: data.id });
      return { conversationId: data.id, wasCreated: false };
    }
  }

  // Strategy 3: threadDbId matches a conversation
  if (input.threadDbId) {
    trace("resolve.threadId", "input", { candidate: input.threadDbId });
    const { data } = await (supabase as any)
      .from("conversations_v2").select("id").eq("id", input.threadDbId).maybeSingle();
    if (data?.id) {
      trace("resolve.threadId", "output", { conversationId: data.id });
      return { conversationId: data.id, wasCreated: false };
    }
  }

  // Strategy 4: Auto-create from peer
  if (input.peerUserId) {
    trace("resolve.autoCreate", "input", {
      myUserId: input.myUserId,
      peerUserId: input.peerUserId,
      peerOrbitId: input.peerOrbitId ?? null,
    });
    const conv = await createOrGetDirectConversation({
      myUserId: input.myUserId,
      myOrbitId: input.myOrbitId,
      peerUserId: input.peerUserId,
      peerOrbitId: input.peerOrbitId,
    });
    trace("resolve.autoCreate", "output", { conversationId: conv.id });
    return { conversationId: conv.id, wasCreated: true };
  }

  trace("resolve", "error", { reason: "all_strategies_exhausted" });
  throw new Error("Cannot resolve conversation: no v2ConversationId, contextId, threadId, or peerUserId available.");
}