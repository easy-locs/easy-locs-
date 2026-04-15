import { getMuezzinById, DEFAULT_MUEZZIN_ID } from "@/data/islamic/muezzin-voices";
import { DeviceAudio } from "@/families/device/device-audio";

const LS_MUEZZIN_KEY = "islamic_muezzin_id";
const LS_ADHAN_VOLUME_KEY = "islamic_adhan_volume";

let currentAudio: HTMLAudioElement | null = null;
let preloadedAudio: HTMLAudioElement | null = null;
let currentPrayerName: string | undefined = undefined;
let currentMuezzinName: string | undefined = undefined;

export type AdhanStatus = "idle" | "loading" | "playing" | "error" | "blocked";
type StatusListener = (status: AdhanStatus, message?: string) => void;
let statusListener: StatusListener | null = null;

export function onAdhanStatusChange(listener: StatusListener | null): void {
  statusListener = listener;
}

function emitStatus(status: AdhanStatus, message?: string): void {
  statusListener?.(status, message);
}

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

export function getCurrentAdhanInfo(): { prayerName?: string; muezzinName?: string } {
  return { prayerName: currentPrayerName, muezzinName: currentMuezzinName };
}

async function tryPlayUrl(url: string, volume: number): Promise<HTMLAudioElement> {
  const audio = new Audio(url);
  audio.volume = volume;
  audio.crossOrigin = "anonymous";
  await audio.play();
  return audio;
}

export async function playAdhan(prayerName?: string): Promise<void> {
  stopAdhan();

  const muezzinId = getStoredMuezzinId();
  if (muezzinId === "none") return;

  const voice = getMuezzinById(muezzinId);
  if (!voice || !voice.audioUrl) return;

  const isFajr = prayerName?.toLowerCase() === "fajr";
  const primaryUrl = (isFajr && voice.fajrAudioUrl) ? voice.fajrAudioUrl : voice.audioUrl;
  const urls = [primaryUrl, ...(voice.fallbackUrls ?? [])];

  currentPrayerName = prayerName;
  currentMuezzinName = voice.name;
  emitStatus("loading");

  await DeviceAudio.ensureRunning();
  const volume = getAdhanVolume();

  if (preloadedAudio && preloadedAudio.src.includes(primaryUrl.split("/").pop() ?? "__no_match__")) {
    try {
      preloadedAudio.volume = volume;
      await preloadedAudio.play();
      currentAudio = preloadedAudio;
      preloadedAudio = null;
      emitStatus("playing");
      currentAudio.onended = () => emitStatus("idle");
      return;
    } catch (err) {
      preloadedAudio = null;
      if ((err as DOMException)?.name === "NotAllowedError") {
        emitStatus("blocked", "Appuyez pour jouer l'Adhan");
        return;
      }
    }
  }

  for (let i = 0; i < urls.length; i++) {
    try {
      const audio = await tryPlayUrl(urls[i], volume);
      currentAudio = audio;
      emitStatus("playing");
      audio.onended = () => emitStatus("idle");
      return;
    } catch (err) {
      if ((err as DOMException)?.name === "NotAllowedError") {
        emitStatus("blocked", "Appuyez pour jouer l'Adhan");
        return;
      }
      if (i === urls.length - 1) {
        emitStatus("error", "Impossible de jouer l'Adhan");
      }
    }
  }
}

export function retryAdhan(): void {
  if (currentPrayerName) {
    void playAdhan(currentPrayerName);
  }
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
  currentPrayerName = undefined;
  currentMuezzinName = undefined;
  emitStatus("idle");
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
    await DeviceAudio.ensureRunning();
    const audio = new Audio(voice.audioUrl);
    audio.volume = getAdhanVolume();
    audio.crossOrigin = "anonymous";
    currentAudio = audio;

    await audio.play();

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
