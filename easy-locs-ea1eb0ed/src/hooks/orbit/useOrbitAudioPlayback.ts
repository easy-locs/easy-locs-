/**
 * useOrbitAudioPlayback — Facade hook for the global audio store.
 * Provides per-message playback controls.
 * Uses targeted selectors — never subscribes to the full store.
 */
import { useCallback } from "react";
import { useOrbitAudioStore } from "@/stores/orbit/audio.store";

export function useOrbitAudioPlayback(messageId?: string) {
  const activeMessageId = useOrbitAudioStore(s => s.activeMessageId);
  const storeStatus = useOrbitAudioStore(s => s.status);
  const storeProgress = useOrbitAudioStore(s => s.progress);
  const storeDuration = useOrbitAudioStore(s => s.duration);

  const isActive = activeMessageId === messageId;
  const status = isActive ? storeStatus : ("idle" as const);
  const progress = isActive ? storeProgress : 0;
  const duration = isActive ? storeDuration : 0;

  const play = useCallback(
    (url: string) => {
      if (!messageId) return;
      useOrbitAudioStore.getState().play(messageId, url);
    },
    [messageId],
  );

  const pause = useCallback(() => useOrbitAudioStore.getState().pause(), []);
  const resume = useCallback(() => useOrbitAudioStore.getState().resume(), []);
  const stop = useCallback(() => useOrbitAudioStore.getState().stop(), []);

  const seek = useCallback(
    (p: number) => useOrbitAudioStore.getState().seek(p),
    [],
  );

  const togglePlayPause = useCallback(
    (url: string) => {
      if (!messageId) return;
      const s = useOrbitAudioStore.getState();
      const currentlyActive = s.activeMessageId === messageId;
      if (currentlyActive && s.status === "playing") {
        s.pause();
      } else if (currentlyActive && s.status === "paused") {
        s.resume();
      } else {
        s.play(messageId, url);
      }
    },
    [messageId],
  );

  return {
    isActive,
    status,
    progress,
    duration,
    play,
    pause,
    resume,
    stop,
    seek,
    togglePlayPause,
  };
}
