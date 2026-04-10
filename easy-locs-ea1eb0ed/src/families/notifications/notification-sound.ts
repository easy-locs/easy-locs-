/**
 * notifications.sound — Canonical notification sound player.
 * Uses synthesized Web Audio sounds as primary, MP3 fallback.
 * Components MUST use this instead of inline `new Audio(...)`.
 */
import { playSoundForType, playMessageSound, playPaymentSound, playOrderSound, playAlertSound } from "@/lib/notifications/sounds";

const SYNTH_MAP: Record<string, () => void> = {
  notification: playMessageSound,
  message: playMessageSound,
  payment: playPaymentSound,
  order_new: playOrderSound,
  order_ready: playOrderSound,
  delivery: playOrderSound,
  alert: playAlertSound,
};

const MP3_FALLBACK: Record<string, string> = {
  notification: "/notification.mp3",
  order_new: "/sounds/order-new.mp3",
  order_ready: "/sounds/order-ready.mp3",
  delivery: "/sounds/delivery.mp3",
};

let currentSound: HTMLAudioElement | null = null;

export const NotificationSound = {
  play(key: string, _volume = 0.3): void {
    try {
      const synthFn = SYNTH_MAP[key];
      if (synthFn) {
        synthFn();
        return;
      }

      playSoundForType(key);
    } catch {
      try {
        const url = MP3_FALLBACK[key] || MP3_FALLBACK.notification;
        if (!url) return;
        NotificationSound.stop();
        const audio = new Audio(url);
        audio.volume = _volume;
        audio.play().catch(() => {});
        currentSound = audio;
      } catch { /* audio not available */ }
    }
  },

  stop(): void {
    if (currentSound) {
      currentSound.pause();
      currentSound.currentTime = 0;
      currentSound = null;
    }
  },

  playIfAllowed(key: string, soundEnabled: boolean, volume = 0.3): void {
    if (!soundEnabled) return;
    NotificationSound.play(key, volume);
  },
};
