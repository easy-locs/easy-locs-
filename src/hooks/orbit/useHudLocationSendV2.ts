/**
 * useHudLocationSendV2 — Atomic: encrypted location sharing in chat.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { toast } from "sonner";

export function useHudLocationSendV2(deps: {
  thread: any;
  orgId: string | null;
  userId: string | undefined;
  myOrbitId: string | null;
  e2eReady: boolean;
  encrypt: (msg: string, peerId: string) => Promise<string | null>;
  resolveAuthUserId: () => Promise<string | null>;
  resolveConversationId: (authUserId: string) => Promise<string | null>;
  setShowLocationPicker: (v: boolean) => void;
  t: (key: string) => string;
}) {
  const send = useCallback(async (loc: any) => {
    if (!deps.thread) return;
    const authUserId = await deps.resolveAuthUserId();
    if (!authUserId) return;
    const mapUrl = `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}`;
    const locationMsg = loc.type === "live"
      ? `📡 Live location shared for ${loc.duration}min\n📍 ${mapUrl}`
      : loc.type === "place"
      ? `📍 ${loc.label}\n${loc.address || ""}\n${mapUrl}`
      : `📍 My location\n${mapUrl}`;
    let storedContent = locationMsg;
    const peerId = deps.thread.peerUserId || deps.thread.contextId || deps.thread.id;
    if (deps.e2eReady && peerId) {
      const enc = await deps.encrypt(locationMsg, peerId);
      if (enc) storedContent = enc;
    }
    const conversationId = await deps.resolveConversationId(authUserId);
    if (!conversationId) return;
    await (supabase as any).from("chat_messages_v2").insert({
      conversation_id: conversationId,
      sender_user_id: authUserId,
      sender_orbit_id: deps.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
      receiver_orbit_id: deps.thread.peerOrbitId ?? null,
      type: "location",
      body: storedContent,
      metadata: { lat: loc.lat, lng: loc.lng, mode: loc.type },
    });
    await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", conversationId);
    platformBus.emit("orbit:message_sent", { threadId: deps.thread.threadId || deps.thread.id, contextId: deps.thread.contextId, type: "location" }, "orbit", { userId: deps.userId, orgId: deps.orgId });
    toast.success(deps.t("orbit.location_shared") || "Location shared");
    deps.setShowLocationPicker(false);
  }, [deps]);

  return { sendLocation: send };
}
