import { create } from "zustand";

export type AudioMode = "arabic" | "arabic_tts" | "tts_only";

interface QuranAudioState {
  isPlaying: boolean;
  isLoading: boolean;
  currentSurah: number | null;
  currentAyah: number | null;
  surahName: string;
  surahNameAr: string;
  reciterId: string;
  reciterName: string;
  audioMode: AudioMode;
  continuousPlay: boolean;
  progress: number;
  duration: number;
  showMiniPlayer: boolean;
  transliterationEnabled: boolean;
  wordByWordEnabled: boolean;

  audioElement: HTMLAudioElement | null;
  onNextAyah: (() => void) | null;
  onPrevAyah: (() => void) | null;

  setPlaying: (playing: boolean) => void;
  setLoading: (loading: boolean) => void;
  setCurrentTrack: (surah: number, ayah: number, surahName: string, surahNameAr: string) => void;
  setReciter: (id: string, name: string) => void;
  setAudioMode: (mode: AudioMode) => void;
  setContinuousPlay: (val: boolean) => void;
  setProgress: (progress: number, duration: number) => void;
  setShowMiniPlayer: (show: boolean) => void;
  setTransliteration: (val: boolean) => void;
  setWordByWord: (val: boolean) => void;
  setAudioElement: (el: HTMLAudioElement | null) => void;
  setPlaybackCallbacks: (onNext: (() => void) | null, onPrev: (() => void) | null) => void;
  togglePlayPause: () => void;
  stop: () => void;
}

function loadPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return JSON.parse(v) as T;
  } catch {}
  return fallback;
}

function savePref(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export const useQuranAudioStore = create<QuranAudioState>((set, get) => ({
  isPlaying: false,
  isLoading: false,
  currentSurah: null,
  currentAyah: null,
  surahName: "",
  surahNameAr: "",
  reciterId: loadPref("quran_reciter_id", "ar.alafasy"),
  reciterName: loadPref("quran_reciter_name", "Mishary Rashid Alafasy"),
  audioMode: loadPref<AudioMode>("quran_audio_mode", "arabic"),
  continuousPlay: loadPref("quran_continuous_play", false),
  progress: 0,
  duration: 0,
  showMiniPlayer: false,
  transliterationEnabled: loadPref("quran_transliteration", false),
  wordByWordEnabled: loadPref("quran_word_by_word", false),

  audioElement: null,
  onNextAyah: null,
  onPrevAyah: null,

  setPlaying: (playing) => set({ isPlaying: playing, showMiniPlayer: playing ? true : undefined }),
  setLoading: (loading) => set({ isLoading: loading }),
  setCurrentTrack: (surah, ayah, surahName, surahNameAr) =>
    set({ currentSurah: surah, currentAyah: ayah, surahName, surahNameAr, showMiniPlayer: true }),
  setReciter: (id, name) => {
    savePref("quran_reciter_id", id);
    savePref("quran_reciter_name", name);
    set({ reciterId: id, reciterName: name });
  },
  setAudioMode: (mode) => {
    savePref("quran_audio_mode", mode);
    set({ audioMode: mode });
  },
  setContinuousPlay: (val) => {
    savePref("quran_continuous_play", val);
    set({ continuousPlay: val });
  },
  setProgress: (progress, duration) => set({ progress, duration }),
  setShowMiniPlayer: (show) => set({ showMiniPlayer: show }),
  setTransliteration: (val) => {
    savePref("quran_transliteration", val);
    set({ transliterationEnabled: val });
  },
  setWordByWord: (val) => {
    savePref("quran_word_by_word", val);
    set({ wordByWordEnabled: val });
  },
  setAudioElement: (el) => set({ audioElement: el }),
  setPlaybackCallbacks: (onNext, onPrev) => set({ onNextAyah: onNext, onPrevAyah: onPrev }),
  togglePlayPause: () => {
    const state = get();
    const el = state.audioElement;
    if (state.isPlaying) {
      if (el) el.pause();
      set({ isPlaying: false });
    } else if (el) {
      el.play()
        .then(() => set({ isPlaying: true, showMiniPlayer: true }))
        .catch(() => {});
    }
  },
  stop: () =>
    set({
      isPlaying: false,
      isLoading: false,
      currentSurah: null,
      currentAyah: null,
      progress: 0,
      duration: 0,
      audioElement: null,
      onNextAyah: null,
      onPrevAyah: null,
    }),
}));
