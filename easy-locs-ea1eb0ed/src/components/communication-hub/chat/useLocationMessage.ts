/**
 * useLocationMessage — Location message send via canonical send family.
 * Zero inline Supabase.
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { sendLocation } from "@/families/send/send-location";
import type { SendContext } from "@/families/send/send-context";

type ThreadLike = {
  id: string;
  /** Canonical conversation UUID */
  conversationId?: string | null;
  /** V2 conversation fallback UUID */
  v2ConversationId?: string | null;
  peerOrbitId?: string | null;
};

export function useLocationMessage(params: {
  thread: ThreadLike | null;
  myOrbitId?: string | null;
  resolveAuthUserId: () => Promise<string | null>;
  onThreadUpdate: (threadId: string, updates: Record<string, unknown>) => void;
}) {
  const { t } = useI18n();
  const sendLocationMsg = useCallback(
    async (loc: {
      lat: number;
      lng: number;
      type?: "pin" | "live" | "place";
      label?: string;
      address?: string;
      duration?: number;
    }) => {
      const conversationId = params.thread?.conversationId || params.thread?.v2ConversationId;
      if (!conversationId) return;

      const authUserId = await params.resolveAuthUserId();
      if (!authUserId) {
        toast.error(t("orbit.auth_required"));
        return;
      }

      const ctx: SendContext = {
        conversationId,
        senderUserId: authUserId,
        senderOrbitId: params.myOrbitId || `orbit_${authUserId.replace(/-/g, "").substring(0, 8)}`,
        receiverOrbitId: params.thread?.peerOrbitId ?? null,
      };

      try {
        await sendLocation(ctx, {
          lat: loc.lat,
          lng: loc.lng,
          type: loc.type === "live" ? "live" : loc.type === "place" ? "place" : "static",
          label: loc.label,
          address: loc.address,
          duration: loc.duration,
        });

        const body = loc.type === "live"
          ? t("orbit.live_location_for").replace("{duration}", String(loc.duration ?? 15))
          : loc.type === "place"
          ? `📍 ${loc.label || t("orbit.media.location")}`
          : t("orbit.shared_location");

        params.onThreadUpdate(params.thread!.id, {
          lastMessage: body,
          lastMessageTime: new Date().toISOString(),
          lastMessagePreview: body,
        });

        toast.success(t("orbit.location_shared"));
      } catch (e: any) {
        toast.error(t("orbit.location_failed"));
      }
    },
    [params],
  );

  return { sendLocation: sendLocationMsg };
}
