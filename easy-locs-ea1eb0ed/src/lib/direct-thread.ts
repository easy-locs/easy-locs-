/**
 * Direct user-to-user thread utilities.
 * CANONICAL V2 PATH: Uses createOrGetDirectConversation as single source of truth.
 */
import { db as supabase } from "@/services/db";
import { lookupOrbitProfile } from "@/lib/orbit/orbit-data-gateway";
import { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";

interface DirectThreadResult {
  /** Canonical conversation UUID */
  conversationId: string;
  orgId: string;
  isV2?: boolean;
  // ── Deprecated compat ──
  /** @deprecated Use conversationId */
  contextId: string;
  /** @deprecated Use conversationId */
  threadId?: string;
  /** @deprecated Use conversationId */
  v2ConversationId?: string;
}

const pendingDirectThreadRequests = new Map<string, Promise<DirectThreadResult | null>>();

/** Generate a deterministic direct-thread context_id from two user IDs */
export function getDirectContextId(userA: string, userB: string): string {
  const sorted = [userA, userB].sort();
  return `direct:${sorted[0]}:${sorted[1]}`;
}

export function normalizeDirectPair(userA: string, userB: string): [string, string] {
  return [userA, userB].sort() as [string, string];
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
}): Promise<DirectThreadResult | null> {
  assertNotSelf(opts.currentUserId, opts.targetUserId);

  const [userA, userB] = normalizeDirectPair(opts.currentUserId, opts.targetUserId);
  const requestKey = `${userA}:${userB}`;
  const existingPending = pendingDirectThreadRequests.get(requestKey);
  if (existingPending) return existingPending;

  const request = (async () => {
    try {
      const [currentProfile, targetProfile] = await Promise.all([
        lookupOrbitProfile(opts.currentUserId),
        lookupOrbitProfile(opts.targetUserId),
      ]);

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
          conversationId: v2Conv.id,
          contextId: v2Conv.id,       // deprecated compat
          orgId: "",
          threadId: v2Conv.id,        // deprecated compat
          v2ConversationId: v2Conv.id, // deprecated compat
          isV2: true,
        };
      }
    } catch (e) {
      console.warn("[direct-thread] V2 creation error:", e);
    }

    return null;
  })();

  pendingDirectThreadRequests.set(requestKey, request);

  try {
    return await request;
  } finally {
    pendingDirectThreadRequests.delete(requestKey);
  }
}

export async function getOrCreateCanonicalDirectConversation(userAUuid: string, userBUuid: string, targetName = "Contact") {
  return getOrCreateDirectThread({
    currentUserId: userAUuid,
    targetUserId: userBUuid,
    targetName,
  });
}
