/**
 * useHudLocationSend — Atomic hook: handle location message send.
 * Single responsibility: location sharing in HudChatPanel.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { toast } from "sonner";

interface UseHudLocationSendParams {
  thread: any;
  userId: string | undefined;
  orgId: string | null | undefined;
  myOrbitId: string | null;
  e2eReady: boolean;
  encrypt: (text: string, peerId: string) => Promise<string | null>;
  resolveAuthUserId: () => Promise<string | null>;
  resolveConversationId: (authUserId: string) => Promise<string | null>;
  setShowLocationPicker: (v: boolean) => void;
  t: (k: string) => string;
}

export function useHudLocationSend({
  thread, userId, orgId, myOrbitId, e2eReady, encrypt,
  resolveAuthUserId, resolveConversationId, setShowLocationPicker, t,
}: UseHudLocationSendParams) {
  const handleLocationSend = useCallback(async (loc: any) => {
    if (!thread) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    const mapUrl = `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}`;
    const locationMsg = loc.type === "live"
      ? `📡 Live location shared for ${loc.duration}min\n📍 ${mapUrl}`
      : loc.type === "place"
      ? `📍 ${loc.label}\n${loc.address || ""}\n${mapUrl}`
      : `📍 My location\n${mapUrl}`;

    let storedContent = locationMsg;
    const peerId = thread.peerUserId || thread.contextId || thread.id;
    if (e2eReady && peerId) {
      const enc = await encrypt(locationMsg, peerId);
      if (enc) storedContent = enc;
    }

    const conversationId = await resolveConversationId(authUserId);
    if (!conversationId) return;

    await (supabase as any).from("chat_messages_v2").insert({
      conversation_id: conversationId,
      sender_user_id: authUserId,
      sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
      receiver_orbit_id: thread.peerOrbitId ?? null,
      type: "location",
      body: storedContent,
      metadata: { lat: loc.lat, lng: loc.lng, mode: loc.type },
    });

    await (supabase as any).from("conversations_v2").update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", conversationId);

    platformBus.emit("orbit:message_sent", {
      threadId: thread.threadId || thread.id,
      contextId: thread.contextId,
      type: "location",
    }, "orbit", { userId, orgId });

    toast.success(t("orbit.location_shared") || "Location shared");
    setShowLocationPicker(false);
  }, [thread, userId, orgId, myOrbitId, e2eReady, encrypt, resolveAuthUserId, resolveConversationId, setShowLocationPicker, t]);

  return { handleLocationSend };
}
