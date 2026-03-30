/**
 * useHudInlineHandlers — THIN WRAPPER around orbitDispatch for voice/location/view-once.
 * No inline send context, no inline auth resolution — delegated to orbit-dispatch.
 * Voice preview state delegates to composerStore.voiceDrafts (single source of truth).
 */
import { useCallback } from "react";
import { orbitDispatch } from "@/families/orbit-dispatch/orbit-dispatch";
import { computeDisappearAt } from "@/hooks/usePrivacySettings";
import { uploadToStorage } from "@/repositories/communication.repository";
import { useOrbitComposerStore } from "@/stores/orbit/composer.store";
import { toast } from "sonner";

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

export function useHudInlineHandlers(deps: HudInlineHandlersDeps) {
  const composerStore = useOrbitComposerStore();
  const conversationKey = deps.thread?.conversationId || deps.thread?.id || "";

  // Voice preview reads from composer store (single source of truth)
  const voiceDraftRaw = composerStore.voiceDrafts[conversationKey];
  const voicePreview = voiceDraftRaw
    ? { blob: voiceDraftRaw.blob, duration: voiceDraftRaw.durationSeconds, url: voiceDraftRaw.url }
    : null;

  const setVoicePreview = useCallback((preview: { blob: Blob; duration: number; url: string } | null) => {
    if (preview) {
      composerStore.setVoiceDraft(conversationKey, {
        url: preview.url,
        blob: preview.blob,
        durationSeconds: preview.duration,
      });
    } else {
      composerStore.clearVoiceDraft(conversationKey);
    }
  }, [composerStore, conversationKey]);

  const handleVoiceSend = useCallback(async () => {
    if (!voicePreview || !deps.thread || !deps.orgId) return;
    const authUserId = await deps.resolveAuthUserId();
    if (!authUserId) return;

    const blob = voicePreview.blob;
    const dur = voicePreview.duration;
    const localUrl = voicePreview.url;

    // INSTANT: clear voice preview UI via store
    composerStore.clearVoiceDraft(conversationKey);

    try {
      const conversationId = await deps.resolveConversationId(authUserId);
      if (!conversationId) throw new Error("No conversation available");

      const result = await orbitDispatch({
        type: "send_voice",
        conversationId,
        blob,
        durationSeconds: dur,
        localUrl,
        uploadFn: async (file, path) => {
          const url = await uploadToStorage("chat-attachments", path, file);
          if (!url) throw new Error("Voice upload failed");
          return url;
        },
        pathPrefix: `${deps.orgId}/${deps.thread.id}`,
      });

      if (!result.ok) throw new Error(result.error);
      deps.setSecurityLevel("normal");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send voice message");
    } finally {
      URL.revokeObjectURL(localUrl);
    }
  }, [voicePreview, deps, composerStore, conversationKey]);

  const handleLocationSend = useCallback(async (loc: any) => {
    if (!deps.thread) return;

    // INSTANT: close picker
    deps.setShowLocationPicker(false);
    toast.success(deps.t("orbit.location_shared") || "Location shared");

    // Background: dispatch
    (async () => {
      try {
        const authUserId = await deps.resolveAuthUserId();
        if (!authUserId) return;
        const conversationId = await deps.resolveConversationId(authUserId);
        if (!conversationId) return;

        await orbitDispatch({
          type: "send_location",
          conversationId,
          lat: loc.lat,
          lng: loc.lng,
          mode: loc.type === "live" ? "live" : "static",
          label: loc.label,
          address: loc.address,
          liveDurationMinutes: loc.duration,
        });
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
      const conversationId = await deps.resolveConversationId(authUserId);
      if (!conversationId) throw new Error("No conversation available");
      const disappearAt = computeDisappearAt(deps.disappearTTL !== "off" ? deps.disappearTTL : deps.defaultDisappearTtl);

      await orbitDispatch({
        type: "send_media",
        conversationId,
        file,
        caption: "📷 View-once photo",
        viewOnce: true,
        disappearAt,
        uploadFn: async (f, path, onProgress) => {
          const url = await uploadToStorage("chat-attachments", path, f);
          if (!url) throw new Error("Upload failed");
          return url;
        },
        pathPrefix: `${deps.orgId}/${deps.thread.id}`,
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
