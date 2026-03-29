/**
 * contactBridge — Radar contact → Orbit thread bridge.
 * Uses canonical send family for auto-messages. Zero inline Supabase inserts.
 */
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendText } from "@/families/send/send-text";
import { notifyNewMessage } from "@/lib/engines/notification-event-dispatcher";
import type { SendContext } from "@/families/send/send-context";

const db = supabase as any;

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
}): Promise<any> {
  const pairKey = [params.currentUserId, params.targetUserId].sort().join("_");

  const { data: existing } = await db
    .from("conversations_v2")
    .select("*")
    .eq("pair_key", pairKey)
    .maybeSingle();

  if (existing) return { v2ConversationId: existing.id, contextId: existing.id };

  const { data: created, error } = await db
    .from("conversations_v2")
    .insert({
      pair_key: pairKey,
      type: "direct",
      participants: [params.currentUserId, params.targetUserId],
      created_by: params.currentUserId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return { v2ConversationId: created.id, contextId: created.id };
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

    const convId = thread?.v2ConversationId || thread?.contextId;
    if (!convId) {
      toast.error("Could not open conversation");
      return null;
    }

    // Send auto-message via canonical send family
    if (autoMessage) {
      const ctx: SendContext = {
        conversationId: convId,
        senderUserId: currentUserId,
        senderOrbitId: `orbit_${currentUserId.slice(0, 8)}`,
      };

      await sendText(ctx, autoMessage);
      notifyNewMessage(targetUserId, "Contact", autoMessage.slice(0, 80), convId).catch(console.error);
    }

    return convId;
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

    const convId = await openContactThread({
      currentUserId: params.currentUserId,
      targetUserId,
      autoMessage: params.autoMessage || `Hi, I'm interested in ${params.entityName}.`,
    });

    if (convId) {
      params.navigate(`/orbit?thread=${convId}`);
    }
  } catch (err: any) {
    console.error("[contactBridge] contactFromDiscovery error:", err);
    toast.error("Failed to contact");
  }
}
