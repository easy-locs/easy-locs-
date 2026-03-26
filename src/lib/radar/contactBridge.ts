/**
 * Radar → Orbit Contact Bridge
 * Opens a V2 direct thread from any discovery surface (Radar, Listing, Home).
 * Injects business context into the conversation.
 */
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";
import { toast } from "sonner";
import { notifyNewMessage } from "@/lib/engines/notification-event-dispatcher";
import type { NavigateFunction } from "react-router-dom";

export interface ContactBridgeOpts {
  currentUserId: string;
  entityId: string;
  entityType: "shop" | "listing" | "service" | "property" | "hotel";
  entityName: string;
  ownerUserId?: string;
  navigate: NavigateFunction;
  source: "radar" | "listing" | "home" | "search" | "map";
  autoMessage?: string;
}

async function resolveOwner(entityId: string): Promise<string | null> {
  const { data: sf } = await supabase
    .from("storefront_pages")
    .select("user_id")
    .eq("id", entityId)
    .maybeSingle();
  if (sf?.user_id) return sf.user_id;

  const { data: seed } = await (supabase as any)
    .from("seed_merchants")
    .select("user_id")
    .eq("id", entityId)
    .maybeSingle();
  if (seed?.user_id) return seed.user_id;

  return null;
}

async function resolveOwnerName(userId: string): Promise<string> {
  const { data } = await (supabase as any)
    .from("profiles")
    .select("display_name, email")
    .eq("id", userId)
    .maybeSingle();
  return data?.display_name || data?.email || "Business";
}

export async function contactFromDiscovery(opts: ContactBridgeOpts): Promise<void> {
  const { currentUserId, entityId, entityName, navigate, source, autoMessage } = opts;

  let targetUserId = opts.ownerUserId || null;
  if (!targetUserId) {
    targetUserId = await resolveOwner(entityId);
  }

  if (!targetUserId) {
    toast.error("This business hasn't claimed their profile yet");
    return;
  }

  if (targetUserId === currentUserId) {
    toast.info("This is your own business");
    return;
  }

  try {
    const targetName = await resolveOwnerName(targetUserId);
    const thread = await getOrCreateDirectThread({
      currentUserId,
      targetUserId,
      targetName,
    });

    const convId = thread?.v2ConversationId || thread?.contextId;
    if (!convId) {
      toast.error("Could not open conversation");
      return;
    }

    // Send auto-message with business context
    if (autoMessage) {
      await (supabase as any).from("chat_messages_v2").insert({
        conversation_id: convId,
        sender_user_id: currentUserId,
        sender_orbit_id: `orbit_${currentUserId.slice(0, 8)}`,
        body: autoMessage,
        type: "text",
      });

      await (supabase as any)
        .from("conversations_v2")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", convId);

      // Notify recipient
      notifyNewMessage(targetUserId, "Contact", autoMessage.slice(0, 80), convId).catch(console.error);
    }

    eventBus.emit("CONTACT_INITIATED", {
      targetUserId,
      source,
      entityId,
    });

    navigate(`/orbit?thread=${convId}`);
  } catch (err) {
    console.error("[contactBridge] error:", err);
    toast.error("Failed to open conversation");
  }
}
