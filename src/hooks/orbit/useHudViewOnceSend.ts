/**
 * useHudViewOnceSend — Atomic hook: handle view-once photo upload and send.
 * Single responsibility: view-once media in HudChatPanel.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeDisappearAt } from "@/hooks/usePrivacySettings";
import { toast } from "sonner";

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
      await (supabase as any).from("chat_messages_v2").insert({
        conversation_id: conversationId,
        sender_user_id: authUserId,
        sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiver_orbit_id: thread.peerOrbitId ?? null,
        type: "media",
        body: "📷 View-once photo",
        metadata: { url: finalUrl, view_once: true, disappear_at: disappearAt },
      });
      await (supabase as any).from("conversations_v2").update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", conversationId);
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
