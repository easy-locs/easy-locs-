import { getMuezzinById, DEFAULT_MUEZZIN_ID } from "@/data/islamic/muezzin-voices";

const LS_MUEZZIN_KEY = "islamic_muezzin_id";
const LS_ADHAN_VOLUME_KEY = "islamic_adhan_volume";

let currentAudio: HTMLAudioElement | null = null;
let preloadedAudio: HTMLAudioElement | null = null;

export function getStoredMuezzinId(): string {
  try {
    return localStorage.getItem(LS_MUEZZIN_KEY) ?? DEFAULT_MUEZZIN_ID;
  } catch {
    return DEFAULT_MUEZZIN_ID;
  }
}

export function setStoredMuezzinId(id: string): void {
  try {
    localStorage.setItem(LS_MUEZZIN_KEY, id);
  } catch {}
}

export function getAdhanVolume(): number {
  try {
    const v = localStorage.getItem(LS_ADHAN_VOLUME_KEY);
    if (v !== null) return Math.min(1, Math.max(0, parseFloat(v)));
  } catch {}
  return 0.8;
}

export function setAdhanVolume(vol: number): void {
  try {
    localStorage.setItem(LS_ADHAN_VOLUME_KEY, String(Math.min(1, Math.max(0, vol))));
  } catch {}
}

export function preloadAdhanAudio(muezzinId?: string): void {
  const id = muezzinId ?? getStoredMuezzinId();
  const voice = getMuezzinById(id);
  if (!voice || !voice.audioUrl || voice.id === "none") return;

  try {
    if (preloadedAudio) {
      preloadedAudio.src = "";
      preloadedAudio = null;
    }
    preloadedAudio = new Audio();
    preloadedAudio.preload = "auto";
    preloadedAudio.src = voice.audioUrl;
    preloadedAudio.load();
  } catch {}
}

export async function playAdhan(prayerName?: string): Promise<void> {
  stopAdhan();

  const muezzinId = getStoredMuezzinId();
  if (muezzinId === "none") return;

  const voice = getMuezzinById(muezzinId);
  if (!voice || !voice.audioUrl) return;

  const isFajr = prayerName?.toLowerCase() === "fajr";
  const url = (isFajr && voice.fajrAudioUrl) ? voice.fajrAudioUrl : voice.audioUrl;

  try {
    if (preloadedAudio && preloadedAudio.src.includes(url.split("/").pop() ?? "__no_match__")) {
      currentAudio = preloadedAudio;
      preloadedAudio = null;
    } else {
      currentAudio = new Audio(url);
    }

    currentAudio.volume = getAdhanVolume();
    currentAudio.crossOrigin = "anonymous";

    const playPromise = currentAudio.play();
    if (playPromise) {
      await playPromise.catch(() => {});
    }
  } catch {}
}

export function stopAdhan(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = "";
    } catch {}
    currentAudio = null;
  }
}

export function isAdhanPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}

export async function playAdhanPreview(muezzinId: string): Promise<() => void> {
  stopAdhan();

  if (muezzinId === "none") return () => {};

  const voice = getMuezzinById(muezzinId);
  if (!voice || !voice.audioUrl) return () => {};

  try {
    const audio = new Audio(voice.audioUrl);
    audio.volume = getAdhanVolume();
    audio.crossOrigin = "anonymous";
    currentAudio = audio;

    const playPromise = audio.play();
    if (playPromise) {
      await playPromise.catch(() => {});
    }

    const stopTimer = setTimeout(() => {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
        if (currentAudio === audio) currentAudio = null;
      } catch {}
    }, 15_000);

    return () => {
      clearTimeout(stopTimer);
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
        if (currentAudio === audio) currentAudio = null;
      } catch {}
    };
  } catch {
    return () => {};
  }
}
