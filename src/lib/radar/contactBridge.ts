/**
 * Radar → Orbit Contact Bridge
 * Opens a V2 direct thread from any discovery surface (Radar, Listing, Home).
 * Injects business context (listing/service/property) into the conversation.
 */
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/events/eventBus";
import { toast } from "sonner";
import type { NavigateFunction } from "react-router-dom";

export interface ContactBridgeOpts {
  /** Current authenticated user ID */
  currentUserId: string;
  /** Target entity (shop/listing/service) */
  entityId: string;
  entityType: "shop" | "listing" | "service" | "property" | "hotel";
  entityName: string;
  /** Optional: resolve owner from storefront/seed */
  ownerUserId?: string;
  /** Navigation function */
  navigate: NavigateFunction;
  /** Source surface for analytics */
  source: "radar" | "listing" | "home" | "search" | "map";
  /** Optional auto-message */
  autoMessage?: string;
}

/**
 * Resolve the owner user_id of a storefront or seed merchant.
 */
async function resolveOwner(entityId: string): Promise<string | null> {
  // Try storefront first
  const { data: sf } = await supabase
    .from("storefront_pages")
    .select("user_id")
    .eq("id", entityId)
    .maybeSingle();
  if (sf?.user_id) return sf.user_id;

  // Try seed_merchants (may not have user_id)
  const { data: seed } = await (supabase as any)
    .from("seed_merchants")
    .select("user_id")
    .eq("id", entityId)
    .maybeSingle();
  if (seed?.user_id) return seed.user_id;

  return null;
}

/**
 * Open a direct Orbit V2 conversation with the entity owner.
 * Resolves owner, creates thread, optionally sends context message.
 */
export async function contactFromDiscovery(opts: ContactBridgeOpts): Promise<void> {
  const {
    currentUserId,
    entityId,
    entityType,
    entityName,
    navigate,
    source,
    autoMessage,
  } = opts;

  let targetUserId = opts.ownerUserId || null;

  // Resolve owner if not provided
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
    const thread = await getOrCreateDirectThread({
      currentUserId,
      targetUserId,
    });

    if (!thread?.conversationId) {
      toast.error("Could not open conversation");
      return;
    }

    // Send auto-message with business context if provided
    if (autoMessage) {
      await supabase.from("chat_messages_v2").insert({
        conversation_id: thread.conversationId,
        sender_id: currentUserId,
        content: autoMessage,
        message_type: "text",
      });

      // Update conversation timestamp
      await supabase
        .from("conversations_v2")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", thread.conversationId);
    }

    // Emit event for analytics/sync
    eventBus.emit("CONTACT_INITIATED", {
      targetUserId,
      source,
      entityId,
    });

    // Navigate to the thread
    navigate(`/orbit?thread=${thread.conversationId}`);
  } catch (err) {
    console.error("[contactBridge] error:", err);
    toast.error("Failed to open conversation");
  }
}
