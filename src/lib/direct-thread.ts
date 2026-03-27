/**
 * Direct user-to-user thread utilities.
 * CANONICAL V2 PATH: Uses createOrGetDirectConversation as single source of truth.
 *
 * FIXED: Removed duplicate .limit(200) scan that was already done inside
 * createOrGetDirectConversation, eliminating a redundant DB roundtrip.
 */
import { supabase } from "@/integrations/supabase/client";
import { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";

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
 * Delegates entirely to createOrGetDirectConversation (single DB path).
 */
export async function getOrCreateDirectThread(opts: {
  currentUserId: string;
  targetUserId: string;
  targetName: string;
}): Promise<{ contextId: string; orgId: string; threadId?: string; v2ConversationId?: string; isV2?: boolean } | null> {
  assertNotSelf(opts.currentUserId, opts.targetUserId);

  try {
    // Fetch orbit profiles for both users in a single query
    const { data: orbitProfiles } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("id, orbit_id, display_name, email, avatar_url")
      .in("id", [opts.currentUserId, opts.targetUserId]);

    const profileMap = new Map((orbitProfiles || []).map((p: any) => [p.id, p]));
    const currentProfile: any = profileMap.get(opts.currentUserId);
    const targetProfile: any = profileMap.get(opts.targetUserId);

    // Single canonical path — no duplicate scan
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
