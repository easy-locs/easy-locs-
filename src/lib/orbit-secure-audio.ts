/**
 * OrbitSecureAudio — Generates and plays a secure call announcement
 * using Web Speech API with fallback to oscillator tone.
 * Plays once per call when connection is established.
 */

const ANNOUNCEMENT_TEXT = "Orbit secure call. This call is encrypted.";

let hasPlayedForCall: string | null = null;

/**
 * Play secure call announcement via Web Speech API.
 * Falls back to a short encrypted-tone if TTS unavailable.
 */
export async function playSecureCallAnnouncement(
  callId: string,
  options?: { disabled?: boolean }
): Promise<void> {
  // Anti double-play: only once per call
  if (hasPlayedForCall === callId) return;
  if (options?.disabled) return;

  hasPlayedForCall = callId;

  // Try Web Speech API first
  if ("speechSynthesis" in window) {
    try {
      const synth = window.speechSynthesis;
      // Cancel any pending speech
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(ANNOUNCEMENT_TEXT);
      utterance.rate = 0.95;
      utterance.pitch = 0.85;
      utterance.volume = 0.7;
      utterance.lang = "en-US";

      // Try to find a good English voice
      const voices = synth.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Google"))
        || voices.find(v => v.lang.startsWith("en") && !v.localService)
        || voices.find(v => v.lang.startsWith("en"));
      if (englishVoice) utterance.voice = englishVoice;

      return new Promise<void>((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = () => {
          // Fallback to tone
          playSecureTone().then(resolve).catch(resolve);
        };
        synth.speak(utterance);
        // Safety timeout: if speech doesn't complete in 8s, resolve
        setTimeout(resolve, 8000);
      });
    } catch {
      // Fallback
      return playSecureTone();
    }
  }

  // No speech synthesis: play tone
  return playSecureTone();
}

/**
 * Fallback: play a short futuristic "secure connection" tone.
 */
async function playSecureTone(): Promise<void> {
  try {
    const ctx = new AudioContext();
    const duration = 0.8;

    // Two-tone ascending chord (futuristic feel)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(440, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(880, ctx.currentTime + duration);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(660, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(1320, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + duration);
    osc2.stop(ctx.currentTime + duration);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        ctx.close().catch(() => {});
        resolve();
      }, duration * 1000 + 100);
    });
  } catch {
    // Audio API not available — silent fallback
  }
}

/**
 * Reset the played state (e.g., when call ends).
 */
export function resetSecureAudioState(): void {
  hasPlayedForCall = null;
}
