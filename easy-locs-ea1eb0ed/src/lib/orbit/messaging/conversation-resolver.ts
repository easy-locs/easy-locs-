/**
 * conversation-resolver — Atomic unit: resolve or auto-create a conversationId.
 * Single responsibility: given a thread, return a guaranteed conversationId or throw.
 */
import { db } from "@/services/db";
import { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[CONVERSATION_RESOLVE][${step}] ${phase}:`, payload ?? {});
};

interface ResolveInput {
  /** Canonical conversation UUID — preferred */
  conversationId?: string | null;
  /** Legacy entity ID that might match a conversation */
  entityId?: string | null;
  /** Legacy DB thread ID */
  threadDbId?: string | null;
  peerUserId?: string | null;
  peerOrbitId?: string | null;
  myUserId: string;
  myOrbitId?: string | null;

  // ── Deprecated compat (callers still passing old names) ──
  /** @deprecated Use conversationId */
  v2ConversationId?: string | null;
  /** @deprecated Use entityId */
  contextId?: string | null;
  /** @deprecated Use conversationId or entityId */
  threadId?: string | null;
}

interface ResolveResult {
  conversationId: string;
  wasCreated: boolean;
}

export async function resolveConversationId(input: ResolveInput): Promise<ResolveResult> {
  // Merge canonical + legacy
  const convId = input.conversationId || input.v2ConversationId || input.threadId;
  const entId = input.entityId || input.contextId;

  trace("resolve", "input", {
    conversationId: convId ?? null,
    entityId: entId ?? null,
    peerUserId: input.peerUserId ?? null,
  });

  // Strategy 1: Already have it
  if (convId) {
    trace("resolve", "output", { strategy: "existing", conversationId: convId });
    return { conversationId: convId, wasCreated: false };
  }

  // Strategy 2: entityId matches a conversation
  if (entId) {
    trace("resolve.entityId", "input", { candidate: entId });
    const { data } = await db
      .from("conversations_v2").select("id").eq("id", entId).maybeSingle();
    if (data?.id) {
      trace("resolve.entityId", "output", { conversationId: data.id });
      return { conversationId: data.id, wasCreated: false };
    }
  }

  // Strategy 3: threadDbId matches a conversation
  if (input.threadDbId) {
    trace("resolve.threadDbId", "input", { candidate: input.threadDbId });
    const { data } = await db
      .from("conversations_v2").select("id").eq("id", input.threadDbId).maybeSingle();
    if (data?.id) {
      trace("resolve.threadDbId", "output", { conversationId: data.id });
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
  throw new Error("Cannot resolve conversation: no conversationId, entityId, threadDbId, or peerUserId available.");
}
