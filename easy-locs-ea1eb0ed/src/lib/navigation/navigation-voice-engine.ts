import { useI18nStore } from "@/domains/i18n/i18n.store";
import { findBestVoice, getVoiceBCP47 } from "./locale-voice-map";

const MUTE_STORAGE_KEY = "nav-voice-muted";

interface VoiceEngineState {
  running: boolean;
  muted: boolean;
  queue: string[];
  speaking: boolean;
  lastAnnouncedText: string | null;
}

const state: VoiceEngineState = {
  running: false,
  muted: loadMutePreference(),
  queue: [],
  speaking: false,
  lastAnnouncedText: null,
};

function loadMutePreference(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveMutePreference(muted: boolean) {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
  } catch {}
}

function getLocale(): string {
  return useI18nStore.getState().locale;
}

function processQueue() {
  if (!state.running || state.muted || state.speaking) return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const text = state.queue.shift();
  if (!text) return;

  state.speaking = true;

  const locale = getLocale();
  const bcp47 = getVoiceBCP47(locale);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = bcp47;

  const voice = findBestVoice(locale);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  utterance.onend = () => {
    state.speaking = false;
    processQueue();
  };
  utterance.onerror = () => {
    state.speaking = false;
    processQueue();
  };

  window.speechSynthesis.speak(utterance);
}

export function start() {
  state.running = true;
  state.lastAnnouncedText = null;
  state.queue = [];
  state.speaking = false;
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
}

export function stop() {
  state.running = false;
  state.lastAnnouncedText = null;
  state.queue = [];
  state.speaking = false;
  cancel();
}

export function cancel() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  state.queue = [];
  state.speaking = false;
}

export function announce(text: string) {
  if (!state.running || state.muted) return;
  if (!text || text === state.lastAnnouncedText) return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  state.lastAnnouncedText = text;
  state.queue.push(text);

  if (!state.speaking) {
    processQueue();
  }
}

export function announceInterrupt(text: string) {
  if (!state.running || state.muted) return;
  if (!text) return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  state.queue = [];
  state.speaking = false;
  state.lastAnnouncedText = text;
  state.queue.push(text);
  processQueue();
}

export function isMuted(): boolean {
  return state.muted;
}

export function setMuted(muted: boolean) {
  state.muted = muted;
  saveMutePreference(muted);
  if (muted) {
    cancel();
  }
}

export function toggleMute(): boolean {
  const newVal = !state.muted;
  setMuted(newVal);
  return newVal;
}

export function isRunning(): boolean {
  return state.running;
}

export function resetLastAnnounced() {
  state.lastAnnouncedText = null;
}
