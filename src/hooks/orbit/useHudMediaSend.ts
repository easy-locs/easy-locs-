/**
 * useHudMediaSend — Voice, location, and view-once send via canonical send families.
 * Zero inline Supabase.
 */
import { useCallback } from "react";
import { sendVoice } from "@/families/send/send-voice";
import { sendMedia } from "@/families/send/send-media";
import { sendLocation } from "@/families/send/send-location";
import { platformBus } from "@/lib/shared/platform-bus";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { computeDisappearAt } from "@/hooks/usePrivacySettings";
import { formatVoiceDuration } from "@/hooks/useVoiceRecorder";
import type { ConversationThread } from "@/components/communication-hub/types";
import type { SendContext } from "@/families/send/send-context";

interface MediaSendDeps {
  thread: ConversationThread | null;
  orgId: string | null;
  userId: string | undefined;
  myOrbitId: string | null;
  e2eReady: boolean;
  encrypt: (text: string, peerId: string) => Promise<string | null>;
  resolveAuthUserId: () => Promise<string | null>;
  resolveConversationId: (authUserId: string) => Promise<string | null>;
  uploadToStorage: (file: Blob, path: string) => Promise<string | null>;
  setUploading: (v: boolean) => void;
  disappearTTL: string;
  defaultDisappearTtl: string;
  securityLevel: string;
  setSecurityLevel: (l: string) => void;
  setViewOnceNext: (v: boolean) => void;
  setShowLocationPicker: (v: boolean) => void;
}

function buildCtx(deps: MediaSendDeps, conversationId: string, authUserId: string): SendContext {
  return {
    conversationId,
    senderUserId: authUserId,
    senderOrbitId: deps.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
    receiverOrbitId: (deps.thread as any)?.peerOrbitId ?? null,
    threadId: (deps.thread as any)?.threadId || deps.thread?.id,
    orgId: deps.orgId,
  };
}

export function useHudMediaSend(deps: MediaSendDeps) {
  const { t } = useI18n();

  const handleViewOnceUpload = useCallback(async (file: File) => {
    if (!deps.thread || !deps.orgId) return;
    const authUserId = await deps.resolveAuthUserId();
    if (!authUserId) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("orbit.view_once_only_photo") || "View once only supports photos");
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

      await sendMedia(buildCtx(deps, conversationId, authUserId), {
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
      deps.setUploading(false);
      deps.setViewOnceNext(false);
    }
  }, [deps, t]);

  const handleVoiceSend = useCallback(async (voicePreview: { blob: Blob; duration: number; url: string }) => {
    if (!deps.thread || !deps.orgId) return;
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

      await sendVoice(
        buildCtx(deps, conversationId, authUserId),
        audioUrl,
        voicePreview.duration,
        formatVoiceDuration(voicePreview.duration),
      );

      deps.setSecurityLevel("normal");
      toast.success(t("orbit.voice_sent") || "Voice message sent");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send voice message");
    } finally {
      URL.revokeObjectURL(voicePreview.url);
      deps.setUploading(false);
    }
  }, [deps, t]);

  const handleLocationSend = useCallback(async (loc: any) => {
    if (!deps.thread) return;
    const authUserId = await deps.resolveAuthUserId();
    if (!authUserId) return;
    const conversationId = await deps.resolveConversationId(authUserId);
    if (!conversationId) return;

    try {
      await sendLocation(buildCtx(deps, conversationId, authUserId), {
        lat: loc.lat,
        lng: loc.lng,
        type: loc.type === "live" ? "live" : loc.type === "place" ? "place" : "static",
        label: loc.label,
        address: loc.address,
        duration: loc.duration,
      });

      toast.success(t("orbit.location_shared") || "Location shared");
      deps.setShowLocationPicker(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to share location");
    }
  }, [deps, t]);

  return { handleViewOnceUpload, handleVoiceSend, handleLocationSend };
}
