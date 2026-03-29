/**
 * useHudLocationSendV2 — Atomic: location sharing via canonical send family.
 * Zero inline Supabase.
 */
import { useCallback } from "react";
import { sendLocation } from "@/families/send/send-location";
import { toast } from "sonner";
import type { SendContext } from "@/families/send/send-context";

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
    const conversationId = await deps.resolveConversationId(authUserId);
    if (!conversationId) return;

    const ctx: SendContext = {
      conversationId,
      senderUserId: authUserId,
      senderOrbitId: deps.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
      receiverOrbitId: deps.thread.peerOrbitId ?? null,
      threadId: deps.thread.threadId || deps.thread.id,
      orgId: deps.orgId,
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
      toast.success(deps.t("orbit.location_shared") || "Location shared");
      deps.setShowLocationPicker(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to share location");
    }
  }, [deps]);

  return { sendLocation: send };
}
