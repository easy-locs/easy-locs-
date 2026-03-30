/**
 * useOrbitAudioPlayback — Facade hook for the global audio store.
 * Provides per-message playback controls.
 */
import { useCallback } from "react";
import { useOrbitAudioStore } from "@/stores/orbit/audio.store";

export function useOrbitAudioPlayback(messageId?: string) {
  const store = useOrbitAudioStore();

  const isActive = store.activeMessageId === messageId;
  const status = isActive ? store.status : ("idle" as const);
  const progress = isActive ? store.progress : 0;
  const duration = isActive ? store.duration : 0;

  const play = useCallback(
    (url: string) => {
      if (!messageId) return;
      store.play(messageId, url);
    },
    [store, messageId],
  );

  const pause = useCallback(() => store.pause(), [store]);
  const resume = useCallback(() => store.resume(), [store]);
  const stop = useCallback(() => store.stop(), [store]);

  const seek = useCallback(
    (p: number) => store.seek(p),
    [store],
  );

  const togglePlayPause = useCallback(
    (url: string) => {
      if (!messageId) return;
      if (isActive && status === "playing") {
        store.pause();
      } else if (isActive && status === "paused") {
        store.resume();
      } else {
        store.play(messageId, url);
      }
    },
    [store, messageId, isActive, status],
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
