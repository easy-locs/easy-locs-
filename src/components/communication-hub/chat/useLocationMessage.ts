import { useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type ThreadLike = {
  id: string;
  v2ConversationId?: string | null;
  peerOrbitId?: string | null;
};

export function useLocationMessage(params: {
  thread: ThreadLike | null;
  myOrbitId?: string | null;
  resolveAuthUserId: () => Promise<string | null>;
  onThreadUpdate: (threadId: string, updates: Record<string, unknown>) => void;
}) {
  const sendLocation = useCallback(
    async (loc: {
      lat: number;
      lng: number;
      type?: "pin" | "live" | "place";
      label?: string;
      address?: string;
      duration?: number;
    }) => {
      if (!params.thread?.v2ConversationId) return;

      const authUserId = await params.resolveAuthUserId();
      if (!authUserId) {
        toast.error("Authentication required.");
        return;
      }

      const mapUrl = `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}`;

      const body =
        loc.type === "live"
          ? `📡 Live location for ${loc.duration ?? 15} min`
          : loc.type === "place"
          ? `📍 ${loc.label || "Place"}`
          : "📍 Shared location";

      const now = new Date().toISOString();

      const { error } = await db.from("chat_messages_v2").insert({
        conversation_id: params.thread.v2ConversationId,
        sender_user_id: authUserId,
        sender_orbit_id:
          params.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiver_orbit_id: params.thread.peerOrbitId ?? null,
        type: "location",
        body,
        metadata: {
          lat: loc.lat,
          lng: loc.lng,
          map_url: mapUrl,
          mode: loc.type || "pin",
          label: loc.label ?? null,
          address: loc.address ?? null,
          duration: loc.duration ?? null,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      await db
        .from("conversations_v2")
        .update({
          last_message_at: now,
          last_message_preview: body,
          updated_at: now,
        })
        .eq("id", params.thread.v2ConversationId);

      params.onThreadUpdate(params.thread.id, {
        lastMessage: body,
        lastMessageTime: now,
        lastMessagePreview: body,
      });

      toast.success("Location shared.");
    },
    [params]
  );

  return { sendLocation };
}
