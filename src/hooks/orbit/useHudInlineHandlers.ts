/**
 * useHudInlineHandlers — Atomic: extracts the 3 remaining inline handlers
 * from HudChatPanel (voice send, location send, view-once upload).
 * Single responsibility: orchestrate media sends via chat.
 */
import { useState, useCallback } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { computeDisappearAt } from "@/hooks/usePrivacySettings";
import { formatVoiceDuration } from "@/hooks/useVoiceRecorder";
import { toast } from "sonner";
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";

interface HudInlineHandlersDeps {
  thread: any;
  orgId: string | null;
  userId: string | undefined;
  myOrbitId: string | null;
  e2eReady: boolean;
  encrypt: (msg: string, peerId: string) => Promise<string | null>;
  resolveAuthUserId: () => Promise<string | null>;
  resolveConversationId: (authUserId: string) => Promise<string | null>;
  uploadToStorage: (file: Blob, path: string) => Promise<string | null>;
  setUploading: (v: boolean) => void;
  disappearTTL: string;
  defaultDisappearTtl: string;
  setSecurityLevel: (l: string) => void;
  setViewOnceNext: (v: boolean) => void;
  setShowLocationPicker: (v: boolean) => void;
  t: (key: string) => string;
}

export function useHudInlineHandlers(deps: HudInlineHandlersDeps) {
  const [voicePreview, setVoicePreview] = useState<{ blob: Blob; duration: number; url: string } | null>(null);

  const handleVoiceSend = useCallback(async () => {
    if (!voicePreview || !deps.thread || !deps.orgId) return;
    const authUserId = await deps.resolveAuthUserId();
    if (!authUserId) return;
    deps.setUploading(true);
    try {
      const blob = voicePreview.blob;
      const dur = voicePreview.duration;
      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("webm") ? "webm" : "ogg";
      const path = `${deps.orgId}/${deps.thread.id}/voice-${Date.now()}.${ext}`;
      const audioUrl = await deps.uploadToStorage(blob, path);
      if (!audioUrl) throw new Error("Voice upload failed");
      const conversationId = await deps.resolveConversationId(authUserId);
      if (!conversationId) throw new Error("No conversation available");
      await insertMessage({
        conversationId,
        senderUserId: authUserId,
        senderOrbitId: deps.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiverOrbitId: deps.thread.peerOrbitId ?? null,
        type: "voice",
        body: `🎤 Voice message (${formatVoiceDuration(dur)})`,
        metadata: { audio_url: audioUrl, audio_duration_seconds: dur, transcript_status: "pending" },
      });
      await updateConversationTimestamp(conversationId, `🎤 Voice message (${formatVoiceDuration(dur)})`);
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

  const handleLocationSend = useCallback(async (loc: any) => {
    if (!deps.thread) return;
    const authUserId = await deps.resolveAuthUserId();
    if (!authUserId) return;
    const mapUrl = `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}`;
    const locationMsg = loc.type === "live"
      ? `📡 Live location shared for ${loc.duration}min\n📍 ${mapUrl}`
      : loc.type === "place"
      ? `📍 ${loc.label}\n${loc.address || ""}\n${mapUrl}`
      : `📍 My location\n${mapUrl}`;
    let storedContent = locationMsg;
    const peerId = deps.thread.peerUserId || deps.thread.contextId || deps.thread.id;
    if (deps.e2eReady && peerId) {
      const enc = await deps.encrypt(locationMsg, peerId);
      if (enc) storedContent = enc;
    }
    const conversationId = await deps.resolveConversationId(authUserId);
    if (!conversationId) return;
    await insertMessage({
      conversationId,
      senderUserId: authUserId,
      senderOrbitId: deps.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
      receiverOrbitId: deps.thread.peerOrbitId ?? null,
      type: "location",
      body: storedContent,
      metadata: { lat: loc.lat, lng: loc.lng, mode: loc.type },
    });
    await updateConversationTimestamp(conversationId, locationMsg.slice(0, 120));
    platformBus.emit("orbit:message_sent", { threadId: deps.thread.threadId || deps.thread.id, contextId: deps.thread.contextId, type: "location" }, "orbit", { userId: deps.userId, orgId: deps.orgId });
    toast.success(deps.t("orbit.location_shared") || "Location shared");
    deps.setShowLocationPicker(false);
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
      const finalUrl = await deps.uploadToStorage(file, path);
      if (!finalUrl) throw new Error("Upload failed");
      const disappearAt = computeDisappearAt(deps.disappearTTL !== "off" ? deps.disappearTTL : deps.defaultDisappearTtl);
      const conversationId = await deps.resolveConversationId(authUserId);
      if (!conversationId) throw new Error("No conversation available");
      await insertMessage({
        conversationId,
        senderUserId: authUserId,
        senderOrbitId: deps.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiverOrbitId: deps.thread.peerOrbitId ?? null,
        type: "media",
        body: "📷 View-once photo",
        metadata: { url: finalUrl, view_once: true, disappear_at: disappearAt },
      });
      await updateConversationTimestamp(conversationId, "📷 View-once photo");
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
