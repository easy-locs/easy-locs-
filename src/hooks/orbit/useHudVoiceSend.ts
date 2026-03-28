/**
 * useHudVoiceSend — Atomic hook: handle voice message recording, upload, and send.
 * Single responsibility: voice message lifecycle in HudChatPanel.
 */
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { toast } from "sonner";
import { formatVoiceDuration } from "@/hooks/useVoiceRecorder";

interface UseHudVoiceSendParams {
  thread: any;
  orgId: string | null | undefined;
  myOrbitId: string | null;
  resolveAuthUserId: () => Promise<string | null>;
  resolveConversationId: (authUserId: string) => Promise<string | null>;
  uploadToStorage: (file: Blob, path: string) => Promise<string | null>;
  setUploading: (v: boolean) => void;
  setSecurityLevel: (l: string) => void;
  t: (k: string) => string;
}

export function useHudVoiceSend({
  thread, orgId, myOrbitId, resolveAuthUserId, resolveConversationId,
  uploadToStorage, setUploading, setSecurityLevel, t,
}: UseHudVoiceSendParams) {
  const [voicePreview, setVoicePreview] = useState<{ blob: Blob; duration: number; url: string } | null>(null);

  const handleVoiceSend = useCallback(async () => {
    if (!voicePreview || !thread || !orgId) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    setUploading(true);
    try {
      const blob = voicePreview.blob;
      const dur = voicePreview.duration;
      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("webm") ? "webm" : "ogg";
      const path = `${orgId}/${thread.id}/voice-${Date.now()}.${ext}`;
      const audioUrl = await uploadToStorage(blob, path);
      if (!audioUrl) throw new Error("Voice upload failed");
      const conversationId = await resolveConversationId(authUserId);
      if (!conversationId) throw new Error("No conversation available");
      const { error } = await (supabase as any).from("chat_messages_v2").insert({
        conversation_id: conversationId,
        sender_user_id: authUserId,
        sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiver_orbit_id: thread.peerOrbitId ?? null,
        type: "voice",
        body: `🎤 Voice message (${formatVoiceDuration(dur)})`,
        metadata: { audio_url: audioUrl, audio_duration_seconds: dur, transcript_status: "pending" },
      });
      if (error) throw error;
      await (supabase as any).from("conversations_v2").update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", conversationId);
      setSecurityLevel("normal");
      toast.success(t("orbit.voice_sent") || "Voice message sent");
      platformBus.emit("orbit:message_sent", {
        threadId: thread.threadId || thread.id,
        contextId: thread.contextId,
        type: "voice",
      }, "orbit");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send voice message");
    } finally {
      URL.revokeObjectURL(voicePreview.url);
      setVoicePreview(null);
      setUploading(false);
    }
  }, [voicePreview, thread, orgId, resolveAuthUserId, resolveConversationId, uploadToStorage, myOrbitId, setUploading, setSecurityLevel, t]);

  const discardVoice = useCallback(() => {
    if (voicePreview) URL.revokeObjectURL(voicePreview.url);
    setVoicePreview(null);
  }, [voicePreview]);

  return { voicePreview, setVoicePreview, handleVoiceSend, discardVoice };
}
