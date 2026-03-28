/**
 * createOrGetDirectConversation — Canonical V2+ direct conversation creator.
 * Uses orbitDb for all DB access.
 * IMPORTANT: sets created_by_orbit_id and ensures orbitId is always populated
 * in participants to satisfy RLS policies on conversations_v2.
 */
import { supabase } from "@/integrations/supabase/client";
import { orbitDb } from "@/lib/db/orbitDb";
import type { ConversationParticipant, ConversationRow } from "@/lib/types/comms";

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

/** Generates deterministic orbit_id from user UUID */
function toOrbitId(userId: string): string {
  return `orbit_${userId.slice(0, 12)}`;
}

/** Resolves the real orbit_id from orbit_profiles_v2, or generates one */
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

/** Ensures the user has an orbit_profiles_v2 row (upsert) */
async function ensureOrbitProfile(userId: string, orbitId: string, displayName?: string | null, email?: string | null) {
  try {
    const { data: existing } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existing) {
      await (supabase as any)
        .from("orbit_profiles_v2")
        .insert({
          id: userId,
          orbit_id: orbitId,
          display_name: displayName || null,
          email: email || null,
        });
    }
  } catch (err) {
    console.warn("[createOrGetDirectConversation] ensureOrbitProfile warning:", err);
  }
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

  // Resolve orbit IDs — MUST be non-null for RLS to work
  const myOrbitId = await resolveOrbitId(params.myUserId, params.myOrbitId);
  const peerOrbitId = await resolveOrbitId(params.peerUserId, params.peerOrbitId);

  // Ensure both users have orbit_profiles_v2 entries (required for RLS)
  await ensureOrbitProfile(params.myUserId, myOrbitId, params.myDisplayName, params.myEmail);
  await ensureOrbitProfile(params.peerUserId, peerOrbitId, params.peerDisplayName, params.peerEmail);

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
