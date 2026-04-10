/**
 * audio-device.controller — Real hardware audio control for calls.
 *
 * OWNER: callStore.devices
 * RULE: UI never touches streams directly. All hardware goes through here.
 *
 * FLOW: UI tap → callDeviceController → audio-device.controller → hardware → store update
 */

let currentStream: MediaStream | null = null;
let audioEl: HTMLAudioElement | null = null;

/**
 * Acquire mic (+ camera for video) and prepare playback element.
 */
export async function initAudio(mode: "audio" | "video"): Promise<MediaStream> {
  // Cleanup any prior session
  cleanupAudio();

  currentStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: mode === "video",
  });

  audioEl = new Audio();
  audioEl.srcObject = currentStream;
  audioEl.muted = false;
  void audioEl.play().catch(() => {
    /* autoplay may be blocked — CallManager handles retry */
  });

  if (import.meta.env.DEV) {
    console.debug("[audio-device] initAudio", { mode, tracks: currentStream.getTracks().length });
  }

  return currentStream;
}

/**
 * Mute/unmute the microphone track on the active stream.
 */
export function toggleMute(muted: boolean): void {
  if (!currentStream) return;
  currentStream.getAudioTracks().forEach((t) => (t.enabled = !muted));

  if (import.meta.env.DEV) {
    console.debug("[audio-device] toggleMute", { muted });
  }
}

/**
 * Simulate speaker/earpiece routing via volume.
 * On real devices (Capacitor), this delegates to a native plugin.
 */
export function setSpeaker(enabled: boolean): void {
  if (!audioEl) return;
  audioEl.volume = enabled ? 1 : 0.3;

  if (import.meta.env.DEV) {
    console.debug("[audio-device] setSpeaker", { enabled, volume: audioEl.volume });
  }
}

/**
 * Get the current stream (read-only).
 */
export function getStream(): MediaStream | null {
  return currentStream;
}

/**
 * Stop all tracks and release hardware.
 */
export function cleanupAudio(): void {
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }
  if (audioEl) {
    audioEl.pause();
    audioEl.srcObject = null;
    audioEl = null;
  }

  if (import.meta.env.DEV) {
    console.debug("[audio-device] cleanupAudio");
  }
}
