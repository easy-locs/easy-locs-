/**
 * useHudMediaSend — Extracted from HudChatPanel.
 * Single responsibility: voice send, location send, view-once upload.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { computeDisappearAt } from "@/hooks/usePrivacySettings";
import { formatVoiceDuration } from "@/hooks/useVoiceRecorder";
import type { ConversationThread } from "@/components/communication-hub/types";

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
      const { error } = await (supabase as any).from("chat_messages_v2").insert({
        conversation_id: conversationId,
        sender_user_id: authUserId,
        sender_orbit_id: deps.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiver_orbit_id: deps.thread.peerOrbitId ?? null,
        type: "voice",
        body: `🎤 Voice message (${formatVoiceDuration(voicePreview.duration)})`,
        metadata: { audio_url: audioUrl, audio_duration_seconds: voicePreview.duration, transcript_status: "pending" },
      });
      if (error) throw error;
      await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", conversationId);
      deps.setSecurityLevel("normal");
      toast.success(t("orbit.voice_sent") || "Voice message sent");
      platformBus.emit("orbit:message_sent", { threadId: deps.thread.threadId || deps.thread.id, contextId: deps.thread.contextId, type: "voice" }, "orbit", { userId: authUserId, orgId: deps.orgId });
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
    await (supabase as any).from("chat_messages_v2").insert({
      conversation_id: conversationId,
      sender_user_id: authUserId,
      sender_orbit_id: deps.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
      receiver_orbit_id: deps.thread.peerOrbitId ?? null,
      type: "location",
      body: storedContent,
      metadata: { lat: loc.lat, lng: loc.lng, mode: loc.type },
    });
    await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", conversationId);
    platformBus.emit("orbit:message_sent", { threadId: deps.thread.threadId || deps.thread.id, contextId: deps.thread.contextId, type: "location" }, "orbit", { userId: deps.userId, orgId: deps.orgId });
    toast.success(t("orbit.location_shared") || "Location shared");
    deps.setShowLocationPicker(false);
  }, [deps, t]);

  return { handleViewOnceUpload, handleVoiceSend, handleLocationSend };
}
