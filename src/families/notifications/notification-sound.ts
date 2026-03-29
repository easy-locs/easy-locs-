/**
 * notifications.sound — Canonical notification sound player.
 * Single source for all notification/alert sounds across the app.
 * Components MUST use this instead of inline `new Audio(...)`.
 */

const SOUNDS: Record<string, string> = {
  notification: "/notification.mp3",
  order_new: "/sounds/order-new.mp3",
  order_ready: "/sounds/order-ready.mp3",
  delivery: "/sounds/delivery.mp3",
  message: "/notification.mp3",
  payment: "/notification.mp3",
};

let currentSound: HTMLAudioElement | null = null;

export const NotificationSound = {
  /** Play a notification sound by key */
  play(key: string, volume = 0.3): void {
    try {
      const url = SOUNDS[key] || SOUNDS.notification;
      NotificationSound.stop();
      const audio = new Audio(url);
      audio.volume = volume;
      audio.play().catch(() => { /* autoplay policy */ });
      currentSound = audio;
    } catch {
      /* audio not available */
    }
  },

  /** Stop current notification sound */
  stop(): void {
    if (currentSound) {
      currentSound.pause();
      currentSound.currentTime = 0;
      currentSound = null;
    }
  },

  /** Play if preferences allow */
  playIfAllowed(key: string, soundEnabled: boolean, volume = 0.3): void {
    if (!soundEnabled) return;
    NotificationSound.play(key, volume);
  },
};
