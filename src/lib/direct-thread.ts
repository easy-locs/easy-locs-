/**
 * Direct user-to-user thread utilities.
 * CANONICAL V2 PATH: Creates conversations_v2 entries for direct messaging.
 * Legacy conversation_threads are only used as fallback for business contexts.
 */
import { supabase } from "@/integrations/supabase/client";
import { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";

function normalizeParticipant(participant: any) {
  return {
    userId:
      participant?.userId ||
      participant?.user_id ||
      participant?.id ||
      (typeof participant === "string" ? participant : null),
    orbitId: participant?.orbitId || participant?.orbit_id || null,
    displayName: participant?.displayName || participant?.display_name || participant?.name || null,
    email: participant?.email || null,
    avatarUrl: participant?.avatarUrl || participant?.avatar_url || null,
  };
}

/** Generate a deterministic direct-thread context_id from two user IDs */
export function getDirectContextId(userA: string, userB: string): string {
  const sorted = [userA, userB].sort();
  return `direct:${sorted[0]}:${sorted[1]}`;
}

/** Self-conversation guard */
function assertNotSelf(currentUserId: string, targetUserId: string): void {
  if (currentUserId === targetUserId) {
    throw new Error("[direct-thread] BLOCKED: Cannot create self-conversation");
  }
}

/**
 * Find or create a V2 direct conversation between two users.
 * Returns the V2 conversation ID and metadata.
 */
export async function getOrCreateDirectThread(opts: {
  currentUserId: string;
  targetUserId: string;
  targetName: string;
}): Promise<{ contextId: string; orgId: string; threadId?: string; v2ConversationId?: string; isV2?: boolean } | null> {
  assertNotSelf(opts.currentUserId, opts.targetUserId);

  const contextId = getDirectContextId(opts.currentUserId, opts.targetUserId);

  // ── 1. Check V2 conversations first (canonical) ──
  try {
    const { data: v2Existing } = await (supabase as any)
      .from("conversations_v2")
      .select("id, participants")
      .eq("type", "direct")
      .limit(200);

    if (v2Existing?.length) {
      for (const conv of v2Existing) {
        const participants = conv.participants as any[];
        if (!Array.isArray(participants)) continue;
        const userIds = participants
          .map(normalizeParticipant)
          .map((p) => p.userId)
          .filter(Boolean);
        if (
          userIds.includes(opts.currentUserId) &&
          userIds.includes(opts.targetUserId) &&
          userIds.length === 2
        ) {
          return {
            contextId: conv.id,
            orgId: "",
            threadId: conv.id,
            v2ConversationId: conv.id,
            isV2: true,
          };
        }
      }
    }
  } catch (e) {
    console.warn("[direct-thread] V2 lookup failed:", e);
  }

  // ── 2. Create V2 conversation (canonical path only) ──
  try {
    const { data: orbitProfiles } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("id, orbit_id, display_name, email, avatar_url")
      .in("id", [opts.currentUserId, opts.targetUserId]);

    const profileMap = new Map((orbitProfiles || []).map((p: any) => [p.id, p]));
    const currentProfile: any = profileMap.get(opts.currentUserId);
    const targetProfile: any = profileMap.get(opts.targetUserId);

    const v2Conv = await createOrGetDirectConversation({
      myUserId: opts.currentUserId,
      myOrbitId: currentProfile?.orbit_id || null,
      myEmail: currentProfile?.email || null,
      myDisplayName: currentProfile?.display_name || null,
      peerUserId: opts.targetUserId,
      peerOrbitId: targetProfile?.orbit_id || null,
      peerEmail: targetProfile?.email || null,
      peerDisplayName: targetProfile?.display_name || opts.targetName,
    });

    if (v2Conv?.id) {
      return {
        contextId: v2Conv.id,
        orgId: "",
        threadId: v2Conv.id,
        v2ConversationId: v2Conv.id,
        isV2: true,
      };
    }
  } catch (e) {
    console.warn("[direct-thread] V2 creation error:", e);
  }

  return null;
}
