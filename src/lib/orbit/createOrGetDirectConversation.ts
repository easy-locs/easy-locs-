/**
 * createOrGetDirectConversation — Canonical V2+ direct conversation creator.
 * Uses orbitDb for all DB access.
 * FLOW GATE INTEGRATED: prevents duplicate concurrent creation for same pair.
 * IMPORTANT: sets created_by_orbit_id and ensures orbitId is always populated
 * in participants to satisfy RLS policies on conversations_v2.
 */
import { supabase } from "@/integrations/supabase/client";
import { orbitDb } from "@/lib/db/orbitDb";
import { ensureOrbitProfile } from "@/lib/orbit/ensureOrbitProfile";
import type { ConversationParticipant, ConversationRow } from "@/lib/types/comms";
import { isFlowActive, enterFlow, exitFlow } from "@/domains/orbit/flow-gate/orbit-flow-gate";

type Params = {
  myUserId: string;
  myOrbitId?: string | null;
  myEmail?: string | null;
  myDisplayName?: string | null;
  peerUserId: string;
  peerOrbitId?: string | null;
  peerEmail?: string | null;
  peerDisplayName?: string | null;
};

function toOrbitId(userId: string): string {
  return `orbit_${userId.slice(0, 12)}`;
}

async function resolveOrbitId(userId: string, fallback?: string | null): Promise<string> {
  if (fallback) return fallback;
  try {
    const { data } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("orbit_id")
      .eq("id", userId)
      .maybeSingle();
    if (data?.orbit_id) return data.orbit_id;
  } catch {
    // fallback
  }
  return toOrbitId(userId);
}

async function ensureConversationParticipantProfile(userId: string, orbitId: string, displayName?: string | null, email?: string | null) {
  await ensureOrbitProfile({
    userId,
    orbitId,
    displayName: displayName ?? null,
    email: email ?? null,
  });
}

function normalizeParticipants(
  params: Params,
  myOrbitId: string,
  peerOrbitId: string,
): ConversationParticipant[] {
  return [
    {
      userId: params.myUserId,
      orbitId: myOrbitId,
      email: params.myEmail ?? null,
      displayName: params.myDisplayName ?? null,
    },
    {
      userId: params.peerUserId,
      orbitId: peerOrbitId,
      email: params.peerEmail ?? null,
      displayName: params.peerDisplayName ?? null,
    },
  ];
}

function normalizeParticipantUserIds(participants: unknown): string[] {
  if (!Array.isArray(participants)) return [];
  return participants
    .map((participant: any) => participant?.userId || participant?.user_id || participant?.id || null)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort();
}

export async function createOrGetDirectConversation(params: Params): Promise<ConversationRow> {
  if (params.myUserId === params.peerUserId) {
    throw new Error("Cannot create a conversation with yourself");
  }

  // ── FLOW GATE: prevent duplicate concurrent creation for same pair ──
  const pairKey = [params.myUserId, params.peerUserId].sort().join(":");
  const flowKey = `conversation.openDirect:${pairKey}`;
  if (isFlowActive(flowKey)) {
    // Wait briefly for in-flight creation, then retry lookup
    await new Promise(r => setTimeout(r, 500));
    // If still active, throw to prevent stacking
    if (isFlowActive(flowKey)) {
      throw new Error("Duplicate direct conversation creation in progress");
    }
  }

  enterFlow(flowKey);
  try {
    return await _createOrGetDirectConversationInternal(params);
  } finally {
    exitFlow(flowKey);
  }
}

async function _createOrGetDirectConversationInternal(params: Params): Promise<ConversationRow> {

  // Resolve canonical orbit IDs for both participants
  const [myOrbitId, peerOrbitId] = await Promise.all([
    resolveOrbitId(params.myUserId, params.myOrbitId),
    resolveOrbitId(params.peerUserId, params.peerOrbitId),
  ]);

  // Ensure both users have orbit_profiles_v2 entries (required for RLS)
  await ensureConversationParticipantProfile(params.myUserId, myOrbitId, params.myDisplayName, params.myEmail);
  await ensureConversationParticipantProfile(params.peerUserId, peerOrbitId, params.peerDisplayName, params.peerEmail);

  const directUserIds = [params.myUserId, params.peerUserId].sort();

  // Try to find existing conversation
  const { data: existing, error: existingError } = await orbitDb.conversations
    .list()
    .eq("type", "direct")
    .contains("metadata", { direct_user_ids: directUserIds })
    .maybeSingle();

  if (existingError) {
    console.warn("[createOrGetDirectConversation] lookup error:", existingError.message);
    // Don't throw — might be RLS issue on empty result, continue to create
  }
  if (existing) return existing as ConversationRow;

  // Backward-compatible lookup — scoped to this user's conversations only
  const { data: legacyCompatibleRows, error: legacyLookupError } = await orbitDb.conversations
    .list()
    .eq("type", "direct")
    .limit(50);

  if (legacyLookupError) {
    console.warn("[createOrGetDirectConversation] participant fallback lookup error:", legacyLookupError.message);
  } else if (Array.isArray(legacyCompatibleRows)) {
    const fallbackExisting = legacyCompatibleRows.find((row: any) => {
      const userIds = normalizeParticipantUserIds(row?.participants);
      return userIds.length === 2 && userIds[0] === directUserIds[0] && userIds[1] === directUserIds[1];
    });

    if (fallbackExisting) {
      // Backfill direct_user_ids for faster future lookups
      const metadata = typeof fallbackExisting.metadata === "object" && fallbackExisting.metadata !== null
        ? fallbackExisting.metadata
        : {};
      if (!Array.isArray((metadata as any).direct_user_ids)) {
        orbitDb.conversations.update(fallbackExisting.id, {
          metadata: { ...metadata, direct_user_ids: directUserIds },
          updated_at: new Date().toISOString(),
        }).catch(() => {}); // fire-and-forget backfill
      }
      return fallbackExisting as ConversationRow;
    }
  }

  const participants = normalizeParticipants(params, myOrbitId, peerOrbitId);

  const { data, error } = await orbitDb.conversations.insert({
    type: "direct",
    title: null,
    participants,
    created_by_orbit_id: myOrbitId,
    metadata: { direct_user_ids: directUserIds },
    last_message_at: new Date().toISOString(),
    last_message_preview: null,
  });

  if (error) {
    console.error("[createOrGetDirectConversation] insert error:", error);
    throw error;
  }
  return data as ConversationRow;
}
