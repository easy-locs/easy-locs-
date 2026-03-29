/**
 * useHudVoiceSendV2 — Atomic: voice message recording + upload + send via canonical family.
 * Zero inline Supabase.
 */
import { useState, useCallback } from "react";
import { sendVoice } from "@/families/send/send-voice";
import { formatVoiceDuration } from "@/hooks/useVoiceRecorder";
import { toast } from "sonner";
import type { SendContext } from "@/families/send/send-context";

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

  const sendVoiceMsg = useCallback(async () => {
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

      const ctx: SendContext = {
        conversationId,
        senderUserId: authUserId,
        senderOrbitId: deps.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiverOrbitId: deps.thread.peerOrbitId ?? null,
        threadId: deps.thread.threadId || deps.thread.id,
        orgId: deps.orgId,
      };

      await sendVoice(ctx, audioUrl, voicePreview.duration, formatVoiceDuration(voicePreview.duration));
      deps.setSecurityLevel("normal");
      toast.success(deps.t("orbit.voice_sent") || "Voice message sent");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send voice message");
    } finally {
      URL.revokeObjectURL(voicePreview.url);
      setVoicePreview(null);
      deps.setUploading(false);
    }
  }, [voicePreview, deps]);

  return { voicePreview, setVoicePreview, sendVoice: sendVoiceMsg };
}
