/**
 * useHudInlineHandlers — Atomic: voice/location/view-once send via canonical send family.
 * Zero inline supabase calls. All sends go through families/send.
 */
import { useState, useCallback } from "react";
import { sendVoiceOptimistic } from "@/families/send/send-voice-optimistic";
import { sendLocationOptimistic } from "@/families/send/send-location-optimistic";
import type { LocationPayload } from "@/families/send/send-location";
import { sendMedia } from "@/families/send/send-media";
import { computeDisappearAt } from "@/hooks/usePrivacySettings";
import { formatVoiceDuration } from "@/hooks/useVoiceRecorder";
import { uploadToStorage } from "@/repositories/communication.repository";
import { toast } from "sonner";
import type { SendContext } from "@/families/send/send-context";

interface HudInlineHandlersDeps {
  thread: any;
  orgId: string | null;
  userId: string | undefined;
  myOrbitId: string | null;
  e2eReady: boolean;
  encrypt: (msg: string, peerId: string) => Promise<string | null>;
  resolveAuthUserId: () => Promise<string | null>;
  resolveConversationId: (authUserId: string) => Promise<string | null>;
  setUploading: (v: boolean) => void;
  disappearTTL: string;
  defaultDisappearTtl: string;
  setSecurityLevel: (l: string) => void;
  setViewOnceNext: (v: boolean) => void;
  setShowLocationPicker: (v: boolean) => void;
  setRawMessages: (updater: any) => void;
  t: (key: string) => string;
}

function buildSendContext(deps: HudInlineHandlersDeps, authUserId: string, conversationId: string): SendContext {
  return {
    conversationId,
    senderUserId: authUserId,
    senderOrbitId: deps.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
    receiverOrbitId: deps.thread?.peerOrbitId ?? null,
    orgId: deps.orgId,
  };
}

export function useHudInlineHandlers(deps: HudInlineHandlersDeps) {
  const [voicePreview, setVoicePreview] = useState<{ blob: Blob; duration: number; url: string } | null>(null);

  const handleVoiceSend = useCallback(async () => {
    if (!voicePreview || !deps.thread || !deps.orgId) return;
    const authUserId = await deps.resolveAuthUserId();
    if (!authUserId) return;

    // Capture preview data before clearing UI
    const blob = voicePreview.blob;
    const dur = voicePreview.duration;
    const localUrl = voicePreview.url;

    // ── INSTANT: clear voice preview UI immediately ──
    setVoicePreview(null);

    try {
      const conversationId = await deps.resolveConversationId(authUserId);
      if (!conversationId) throw new Error("No conversation available");
      const ctx = buildSendContext(deps, authUserId, conversationId);

      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("webm") ? "webm" : "ogg";
      const storagePath = `${deps.orgId}/${deps.thread.id}/voice-${Date.now()}.${ext}`;

      // Optimistic: inserts message with local blob URL immediately,
      // then uploads + reconciles in background
      await sendVoiceOptimistic(ctx, {
        blob,
        localUrl,
        durationSeconds: dur,
        durationLabel: formatVoiceDuration(dur),
        uploadFn: async (b, path) => {
          const url = await uploadToStorage("chat-attachments", path, b);
          if (!url) throw new Error("Voice upload failed");
          return url;
        },
        storagePath,
      });

      deps.setSecurityLevel("normal");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send voice message");
    } finally {
      URL.revokeObjectURL(localUrl);
    }
  }, [voicePreview, deps]);

  const handleLocationSend = useCallback(async (loc: any) => {
    if (!deps.thread) return;

    // ── INSTANT: close picker + toast immediately ──
    deps.setShowLocationPicker(false);
    toast.success(deps.t("orbit.location_shared") || "Location shared");

    // ── Background: resolve + optimistic insert (card appears via realtime) ──
    (async () => {
      try {
        const authUserId = await deps.resolveAuthUserId();
        if (!authUserId) return;
        const conversationId = await deps.resolveConversationId(authUserId);
        if (!conversationId) return;
        const ctx = buildSendContext(deps, authUserId, conversationId);
        const payload: LocationPayload = {
          lat: loc.lat,
          lng: loc.lng,
          type: loc.type === "live" ? "live" : loc.type === "place" ? "place" : "static",
          label: loc.label,
          address: loc.address,
          duration: loc.duration,
        };
        await sendLocationOptimistic(ctx, payload);
      } catch (e: any) {
        toast.error(e?.message || "Failed to share location");
      }
    })();
  }, [deps]);

  const handleViewOnceUpload = useCallback(async (file: File) => {
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
      const finalUrl = await uploadToStorage("chat-attachments", path, file);
      if (!finalUrl) throw new Error("Upload failed");
      const disappearAt = computeDisappearAt(deps.disappearTTL !== "off" ? deps.disappearTTL : deps.defaultDisappearTtl);
      const conversationId = await deps.resolveConversationId(authUserId);
      if (!conversationId) throw new Error("No conversation available");
      const ctx = buildSendContext(deps, authUserId, conversationId);
      await sendMedia(ctx, {
        mediaUrl: finalUrl,
        body: "📷 View-once photo",
        viewOnce: true,
        disappearAt,
      });
      toast.success(deps.t("orbit.view_once_sent") || "View-once photo sent");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      deps.setUploading(false);
      deps.setViewOnceNext(false);
    }
  }, [deps]);

  return { voicePreview, setVoicePreview, handleVoiceSend, handleLocationSend, handleViewOnceUpload };
}
