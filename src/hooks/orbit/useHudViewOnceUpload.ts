/**
 * useHudViewOnceUpload — Atomic: ephemeral view-once photo upload + DB insert.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeDisappearAt } from "@/hooks/usePrivacySettings";
import { toast } from "sonner";

export function useHudViewOnceUpload(deps: {
  thread: any;
  orgId: string | null;
  myOrbitId: string | null;
  disappearTTL: string;
  defaultDisappearTtl: string;
  resolveAuthUserId: () => Promise<string | null>;
  resolveConversationId: (authUserId: string) => Promise<string | null>;
  uploadToStorage: (file: File | Blob, path: string) => Promise<string | null>;
  setUploading: (v: boolean) => void;
  setViewOnceNext: (v: boolean) => void;
  t: (key: string) => string;
}) {
  const upload = useCallback(async (file: File) => {
    if (!deps.thread || !deps.orgId) return;
    const authUserId = await deps.resolveAuthUserId();
    if (!authUserId) return;
    if (!file.type.startsWith("image/")) {
      toast.error(deps.t("orbit.view_once_only_photo") || "View once only supports photos");
      return;
    }
    deps.setUploading(true);
    try {
      const path = `${deps.orgId}/${deps.thread.id}/viewonce-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
      const finalUrl = await deps.uploadToStorage(file, path);
      if (!finalUrl) throw new Error("Upload failed");
      const disappearAt = computeDisappearAt(deps.disappearTTL !== "off" ? deps.disappearTTL : deps.defaultDisappearTtl);
      const conversationId = await deps.resolveConversationId(authUserId);
      if (!conversationId) throw new Error("No conversation available");
      await (supabase as any).from("chat_messages_v2").insert({
        conversation_id: conversationId,
        sender_user_id: authUserId,
        sender_orbit_id: deps.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiver_orbit_id: deps.thread.peerOrbitId ?? null,
        type: "media",
        body: "📷 View-once photo",
        metadata: { url: finalUrl, view_once: true, disappear_at: disappearAt },
      });
      await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", conversationId);
      toast.success(deps.t("orbit.view_once_sent") || "View-once photo sent");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      deps.setUploading(false);
      deps.setViewOnceNext(false);
    }
  }, [deps]);

  return { uploadViewOnce: upload };
}
