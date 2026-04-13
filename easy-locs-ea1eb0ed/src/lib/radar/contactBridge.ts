/**
 * contactBridge — Radar contact → Orbit thread bridge.
 * Uses orbitDb for conversation resolution, canonical send family for auto-messages.
 * Zero inline Supabase inserts.
 */
import { db } from "@/services/db";
import { toast } from "sonner";
import { sendText } from "@/families/send/send-text";
import { notifyNewMessage } from "@/lib/engines/notification-event-dispatcher";
import type { SendContext } from "@/families/send/send-context";
import { orbitDb } from "@/lib/db/orbitDb";



async function resolveOwnerName(userId: string): Promise<string> {
  const { data } = await db
    .from("profiles")
    .select("display_name, full_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.display_name || data?.full_name || "Unknown";
}

async function getOrCreateDirectThread(params: {
  currentUserId: string;
  targetUserId: string;
  targetName: string;
}): Promise<{ conversationId: string }> {
  const pairKey = [params.currentUserId, params.targetUserId].sort().join("_");

  // Read via orbitDb
  const { data: existing } = await orbitDb.conversations.list()
    .then((r: any) => r)
    .catch(() => ({ data: null }));

  // Check manually for pair_key since list() returns all
  // Use a targeted read instead
  const { data: found } = await db
    .from("conversations_v2")
    .select("id")
    .eq("pair_key", pairKey)
    .maybeSingle();

  if (found) return { conversationId: found.id };

  // Create via orbitDb
  const { data: created, error } = await orbitDb.conversations.insert({
    pair_key: pairKey,
    type: "direct",
    participants: [params.currentUserId, params.targetUserId],
    created_by: params.currentUserId,
  });

  if (error) throw error;
  return { conversationId: created.id };
}

export async function openContactThread(params: {
  currentUserId: string;
  targetUserId: string;
  autoMessage?: string;
}): Promise<string | null> {
  try {
    const { currentUserId, targetUserId, autoMessage } = params;

    const targetName = await resolveOwnerName(targetUserId);
    const thread = await getOrCreateDirectThread({
      currentUserId,
      targetUserId,
      targetName,
    });

    const conversationId = thread.conversationId;
    if (!conversationId) {
      toast.error("Could not open conversation");
      return null;
    }

    // Send auto-message via canonical send family
    if (autoMessage) {
      const ctx: SendContext = {
        conversationId,
        senderUserId: currentUserId,
        senderOrbitId: `orbit_${currentUserId.slice(0, 8)}`,
      };

      await sendText(ctx, autoMessage);
      notifyNewMessage(targetUserId, "Contact", autoMessage.slice(0, 80), conversationId).catch(console.error);
    }

    return conversationId;
  } catch (err: any) {
    console.error("[contactBridge] openContactThread error:", err);
    toast.error("Failed to open conversation");
    return null;
  }
}

/**
 * contactFromDiscovery — Open a thread from a discovered entity (radar, search).
 * Resolves the entity owner and opens a direct thread with an auto-message.
 */
export async function contactFromDiscovery(params: {
  currentUserId: string;
  entityId: string;
  entityType: string;
  entityName: string;
  navigate: (path: string) => void;
  source?: string;
  autoMessage?: string;
}): Promise<void> {
  try {
    // Resolve the entity owner
    const table = params.entityType === "shop" ? "storefront_pages" : "profiles";
    const ownerField = params.entityType === "shop" ? "owner_id" : "id";
    const { data: entity } = await db
      .from(table)
      .select(ownerField)
      .eq("id", params.entityId)
      .maybeSingle();

    const targetUserId = entity?.[ownerField];
    if (!targetUserId || targetUserId === params.currentUserId) {
      toast.error("Cannot contact this entity");
      return;
    }

    const conversationId = await openContactThread({
      currentUserId: params.currentUserId,
      targetUserId,
      autoMessage: params.autoMessage || `Hi, I'm interested in ${params.entityName}.`,
    });

    if (conversationId) {
      params.navigate(`/orbit?conversation=${conversationId}`);
    }
  } catch (err: any) {
    console.error("[contactBridge] contactFromDiscovery error:", err);
    toast.error("Failed to contact");
  }
}
