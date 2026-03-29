/**
 * useHudViewOnceSend — Atomic: view-once photo upload + send via canonical send family.
 * Zero inline Supabase.
 */
import { useCallback } from "react";
import { sendMedia } from "@/families/send/send-media";
import { computeDisappearAt } from "@/hooks/usePrivacySettings";
import { toast } from "sonner";
import type { SendContext } from "@/families/send/send-context";

interface UseHudViewOnceSendParams {
  thread: any;
  orgId: string | null | undefined;
  myOrbitId: string | null;
  resolveAuthUserId: () => Promise<string | null>;
  resolveConversationId: (authUserId: string) => Promise<string | null>;
  uploadToStorage: (file: File | Blob, path: string) => Promise<string | null>;
  setUploading: (v: boolean) => void;
  disappearTTL: string;
  defaultDisappearTtl: string;
  setViewOnceNext: (v: boolean) => void;
  t: (k: string) => string;
}

export function useHudViewOnceSend({
  thread, orgId, myOrbitId, resolveAuthUserId, resolveConversationId,
  uploadToStorage, setUploading, disappearTTL, defaultDisappearTtl, setViewOnceNext, t,
}: UseHudViewOnceSendParams) {
  const handleViewOnceUpload = useCallback(async (file: File) => {
    if (!thread || !orgId) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("orbit.view_once_only_photo") || "View once only supports photos");
      return;
    }
    setUploading(true);
    try {
      const path = `${orgId}/${thread.id}/viewonce-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
      const finalUrl = await uploadToStorage(file, path);
      if (!finalUrl) throw new Error("Upload failed");
      const disappearAt = computeDisappearAt(disappearTTL !== "off" ? disappearTTL : defaultDisappearTtl);
      const conversationId = await resolveConversationId(authUserId);
      if (!conversationId) throw new Error("No conversation available");

      const ctx: SendContext = {
        conversationId,
        senderUserId: authUserId,
        senderOrbitId: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiverOrbitId: thread.peerOrbitId ?? null,
      };

      await sendMedia(ctx, {
        mediaUrl: finalUrl,
        body: "📷 View-once photo",
        viewOnce: true,
        disappearAt,
        mediaKind: "image",
      });

      toast.success(t("orbit.view_once_sent") || "View-once photo sent");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      setViewOnceNext(false);
    }
  }, [thread, orgId, myOrbitId, resolveAuthUserId, resolveConversationId, uploadToStorage, disappearTTL, defaultDisappearTtl, setViewOnceNext, setUploading, t]);

  return { handleViewOnceUpload };
}
