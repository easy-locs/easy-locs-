/**
 * useHudVoiceSendV2 — Atomic: voice message recording + upload + DB insert.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { formatVoiceDuration } from "@/hooks/useVoiceRecorder";
import { toast } from "sonner";

interface VoicePreview {
  blob: Blob;
  duration: number;
  url: string;
}

export function useHudVoiceSendV2(deps: {
  thread: any;
  orgId: string | null;
  myOrbitId: string | null;
  resolveAuthUserId: () => Promise<string | null>;
  resolveConversationId: (authUserId: string) => Promise<string | null>;
  uploadToStorage: (file: Blob, path: string) => Promise<string | null>;
  setUploading: (v: boolean) => void;
  setSecurityLevel: (l: string) => void;
  t: (key: string) => string;
}) {
  const [voicePreview, setVoicePreview] = useState<VoicePreview | null>(null);

  const sendVoice = useCallback(async () => {
    if (!voicePreview || !deps.thread || !deps.orgId) return;
    const authUserId = await deps.resolveAuthUserId();
    if (!authUserId) return;
    deps.setUploading(true);
    try {
      const ext = voicePreview.blob.type.includes("mp4") ? "m4a" : voicePreview.blob.type.includes("webm") ? "webm" : "ogg";
      const path = `${deps.orgId}/${deps.thread.id}/voice-${Date.now()}.${ext}`;
      const audioUrl = await deps.uploadToStorage(voicePreview.blob, path);
      if (!audioUrl) throw new Error("Voice upload failed");
      const conversationId = await deps.resolveConversationId(authUserId);
      if (!conversationId) throw new Error("No conversation available");
      await (supabase as any).from("chat_messages_v2").insert({
        conversation_id: conversationId,
        sender_user_id: authUserId,
        sender_orbit_id: deps.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiver_orbit_id: deps.thread.peerOrbitId ?? null,
        type: "voice",
        body: `🎤 Voice message (${formatVoiceDuration(voicePreview.duration)})`,
        metadata: { audio_url: audioUrl, audio_duration_seconds: voicePreview.duration, transcript_status: "pending" },
      });
      await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", conversationId);
      deps.setSecurityLevel("normal");
      toast.success(deps.t("orbit.voice_sent") || "Voice message sent");
      platformBus.emit("orbit:message_sent", { threadId: deps.thread.threadId || deps.thread.id, contextId: deps.thread.contextId, type: "voice" }, "orbit", { userId: authUserId, orgId: deps.orgId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to send voice message");
    } finally {
      URL.revokeObjectURL(voicePreview.url);
      setVoicePreview(null);
      deps.setUploading(false);
    }
  }, [voicePreview, deps]);

  return { voicePreview, setVoicePreview, sendVoice };
}
