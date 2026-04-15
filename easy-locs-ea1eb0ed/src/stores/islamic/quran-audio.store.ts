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

export const useQuranAudioStore = create<QuranAudioState>((set) => ({
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
  stop: () =>
    set({
      isPlaying: false,
      isLoading: false,
      currentSurah: null,
      currentAyah: null,
      progress: 0,
      duration: 0,
    }),
}));
