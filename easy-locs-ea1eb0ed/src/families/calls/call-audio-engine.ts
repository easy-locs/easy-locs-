/**
 * CallAudioEngine — Canonical audio management for call lifecycle.
 * Manages ringback (outgoing) and ringtone (incoming) sounds.
 * Guarantees instant stop on state transitions.
 */
import { CallRingtone } from "@/families/calls/call-ringtone";
import type { CallUIState } from "@/stores/orbit/call.store";

let ringbackInterval: ReturnType<typeof setInterval> | null = null;
let ringbackCtx: AudioContext | null = null;

const CallAudioEngine = {
  /**
   * React to call state transitions.
   * Called by the call orchestrator on every state change.
   */
  onStateChange(prevState: CallUIState | null, nextState: CallUIState, direction: "outgoing" | "incoming") {
    // Stop everything on transition
    if (prevState !== nextState) {
      CallAudioEngine.stopAll();
    }

    switch (nextState) {
      case "calling":
      case "ringing":
        if (direction === "outgoing") {
          CallAudioEngine.playRingback();
        }
        break;

      case "incoming":
        if (direction === "incoming") {
          CallRingtone.playIncoming();
        }
        break;

      case "connecting":
      case "active":
      case "ended":
      case "declined":
      case "missed":
      case "failed":
        // All sounds stop
        CallAudioEngine.stopAll();
        break;

      case "idle":
        CallAudioEngine.stopAll();
        break;
    }

    // Play brief end tone for terminal states
    if (nextState === "ended") {
      CallRingtone.playEnded();
    }
    if (nextState === "declined" || nextState === "failed") {
      CallRingtone.playBusy();
    }
  },

  /**
   * Play ringback tone (outgoing call, waiting for peer).
   * Mimics standard phone "ring... ring..." pattern.
   */
  playRingback() {
    CallAudioEngine.stopRingback();
    try {
      ringbackCtx = new AudioContext();

      const playBurst = () => {
        if (!ringbackCtx || ringbackCtx.state === "closed") return;
        if (ringbackCtx.state === "suspended") ringbackCtx.resume().catch(() => {});
        const now = ringbackCtx.currentTime;

        // Standard ringback: 440Hz + 480Hz dual tone, 2s on, 4s off
        [440, 480].forEach((freq) => {
          const osc = ringbackCtx.createOscillator();
          const gain = ringbackCtx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
          gain.gain.setValueAtTime(0.12, now + 1.95);
          gain.gain.linearRampToValueAtTime(0, now + 2.0);
          osc.connect(gain);
          gain.connect(ringbackCtx.destination);
          osc.start(now);
          osc.stop(now + 2.0);
        });
      };

      playBurst();
      ringbackInterval = setInterval(playBurst, 4000); // 2s tone + 2s silence
    } catch (e) {
      console.warn("[CallAudioEngine] ringback failed:", e);
    }
  },

  /** Stop ringback tone */
  stopRingback() {
    if (ringbackInterval) {
      clearInterval(ringbackInterval);
      ringbackInterval = null;
    }
    if (ringbackCtx && ringbackCtx.state !== "closed") {
      ringbackCtx.close().catch(() => {});
      ringbackCtx = null;
    }
  },

  /** Stop all call audio (ringtone + ringback) */
  stopAll() {
    CallAudioEngine.stopRingback();
    CallRingtone.stop();
  },
};

export { CallAudioEngine };
