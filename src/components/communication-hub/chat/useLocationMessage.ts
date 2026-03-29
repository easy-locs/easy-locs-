/**
 * useLocationMessage — Location message send via canonical send family.
 * Zero inline Supabase.
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { sendLocation } from "@/families/send/send-location";
import type { SendContext } from "@/families/send/send-context";

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
  const sendLocationMsg = useCallback(
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

      const ctx: SendContext = {
        conversationId: params.thread.v2ConversationId,
        senderUserId: authUserId,
        senderOrbitId: params.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiverOrbitId: params.thread.peerOrbitId ?? null,
      };

      try {
        await sendLocation(ctx, {
          lat: loc.lat,
          lng: loc.lng,
          mode: loc.type || "pin",
          label: loc.label,
          address: loc.address,
          duration: loc.duration,
        });

        const body = loc.type === "live"
          ? `📡 Live location for ${loc.duration ?? 15} min`
          : loc.type === "place"
          ? `📍 ${loc.label || "Place"}`
          : "📍 Shared location";

        params.onThreadUpdate(params.thread.id, {
          lastMessage: body,
          lastMessageTime: new Date().toISOString(),
          lastMessagePreview: body,
        });

        toast.success("Location shared.");
      } catch (e: any) {
        toast.error(e?.message || "Failed to share location");
      }
    },
    [params],
  );

  return { sendLocation: sendLocationMsg };
}
