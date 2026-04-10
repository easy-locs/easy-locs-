/**
 * useHudInlineHandlers — THIN WRAPPER around orbitDispatch for voice/location/view-once.
 * No inline send context, no inline auth resolution — delegated to orbit-dispatch.
 * Voice preview state delegates to composerStore.voiceDrafts (single source of truth).
 * Uses targeted selectors — never subscribes to the full store.
 */
import { useCallback, useRef } from "react";
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
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const conversationKey = deps.thread?.conversationId || deps.thread?.id || "";

  const voiceDraftRaw = useOrbitComposerStore(s => s.voiceDrafts[conversationKey] ?? null);
  const voicePreview = voiceDraftRaw
    ? { blob: voiceDraftRaw.blob, duration: voiceDraftRaw.durationSeconds, url: voiceDraftRaw.url }
    : null;
  const voicePreviewRef = useRef(voicePreview);
  voicePreviewRef.current = voicePreview;

  const setVoicePreview = useCallback((preview: { blob: Blob; duration: number; url: string } | null) => {
    if (preview) {
      useOrbitComposerStore.getState().setVoiceDraft(conversationKey, {
        url: preview.url,
        blob: preview.blob,
        durationSeconds: preview.duration,
      });
    } else {
      useOrbitComposerStore.getState().clearVoiceDraft(conversationKey);
    }
  }, [conversationKey]);

  const handleVoiceSend = useCallback(async () => {
    const d = depsRef.current;
    const vp = voicePreviewRef.current;
    if (!vp || !d.thread || !d.orgId) return;
    const authUserId = await d.resolveAuthUserId();
    if (!authUserId) return;

    const blob = vp.blob;
    const dur = vp.duration;
    const localUrl = vp.url;

    useOrbitComposerStore.getState().clearVoiceDraft(conversationKey);

    try {
      const conversationId = await d.resolveConversationId(authUserId);
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
        pathPrefix: `${d.orgId}/${d.thread.id}`,
      });

      if (!result.ok) throw new Error(result.error);
      d.setSecurityLevel("normal");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send voice message");
    } finally {
      URL.revokeObjectURL(localUrl);
    }
  }, [conversationKey]);

  const handleLocationSend = useCallback(async (loc: any) => {
    const d = depsRef.current;
    if (!d.thread) return;

    d.setShowLocationPicker(false);
    toast.success(d.t("orbit.location_shared") || "Location shared");

    (async () => {
      try {
        const authUserId = await d.resolveAuthUserId();
        if (!authUserId) return;
        const conversationId = await d.resolveConversationId(authUserId);
        if (!conversationId) return;

        const fullAddress = [loc.building, loc.address].filter(Boolean).join(" — ") || loc.address;
        await orbitDispatch({
          type: "send_location",
          conversationId,
          lat: loc.lat,
          lng: loc.lng,
          mode: loc.type === "live" ? "live" : "static",
          label: loc.label,
          address: fullAddress,
          liveDurationMinutes: loc.duration,
        });
      } catch (e: any) {
        toast.error(e?.message || "Failed to share location");
      }
    })();
  }, []);

  const handleViewOnceUpload = useCallback(async (file: File) => {
    const d = depsRef.current;
    if (!d.thread || !d.orgId) return;
    const authUserId = await d.resolveAuthUserId();
    if (!authUserId) return;
    if (!file.type.startsWith("image/")) {
      toast.error(d.t("orbit.view_once_only_photo") || "View once only supports photos");
      return;
    }
    d.setUploading(true);
    try {
      const conversationId = await d.resolveConversationId(authUserId);
      if (!conversationId) throw new Error("No conversation available");
      const disappearAt = computeDisappearAt(d.disappearTTL !== "off" ? d.disappearTTL : d.defaultDisappearTtl);

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
        pathPrefix: `${d.orgId}/${d.thread.id}`,
      });

      toast.success(d.t("orbit.view_once_sent") || "View-once photo sent");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      d.setUploading(false);
      d.setViewOnceNext(false);
    }
  }, []);

  return { voicePreview, setVoicePreview, handleVoiceSend, handleLocationSend, handleViewOnceUpload };
}
