import { DeviceAudio } from "@/families/device/device-audio";

export async function fetchWithRetry(
  url: string,
  opts?: { retries?: number; backoffMs?: number; signal?: AbortSignal }
): Promise<Response> {
  const retries = opts?.retries ?? 3;
  const backoff = opts?.backoffMs ?? 500;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: opts?.signal });
      if (res.ok) return res;
      if (attempt < retries) await delay(backoff * Math.pow(2, attempt));
    } catch (err) {
      if (opts?.signal?.aborted) throw err;
      if (attempt >= retries) throw err;
      await delay(backoff * Math.pow(2, attempt));
    }
  }
  throw new Error(`Failed after ${retries + 1} attempts: ${url}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function playAudioWithFallback(
  urls: string[],
  opts?: { volume?: number; onEnded?: () => void; onError?: (err: unknown) => void; onTimeUpdate?: (current: number, duration: number) => void }
): Promise<HTMLAudioElement | null> {
  await DeviceAudio.ensureRunning();

  for (const url of urls) {
    try {
      const audio = new Audio(url);
      audio.volume = opts?.volume ?? 0.8;
      audio.crossOrigin = "anonymous";

      if (opts?.onEnded) audio.onended = opts.onEnded;
      if (opts?.onTimeUpdate) {
        audio.ontimeupdate = () => {
          opts.onTimeUpdate!(audio.currentTime, audio.duration || 0);
        };
      }

      await audio.play();
      return audio;
    } catch {
      continue;
    }
  }

  opts?.onError?.(new Error("All audio URLs failed"));
  return null;
}

export function setupMediaSession(opts: {
  title: string;
  artist: string;
  album?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
}): void {
  if (!("mediaSession" in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: opts.title,
    artist: opts.artist,
    album: opts.album ?? "Quran",
    artwork: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  });

  if (opts.onPlay) navigator.mediaSession.setActionHandler("play", opts.onPlay);
  if (opts.onPause) navigator.mediaSession.setActionHandler("pause", opts.onPause);
  if (opts.onPreviousTrack) navigator.mediaSession.setActionHandler("previoustrack", opts.onPreviousTrack);
  if (opts.onNextTrack) navigator.mediaSession.setActionHandler("nexttrack", opts.onNextTrack);
  if (opts.onSeekForward) navigator.mediaSession.setActionHandler("seekforward", opts.onSeekForward);
  if (opts.onSeekBackward) navigator.mediaSession.setActionHandler("seekbackward", opts.onSeekBackward);
}

export function clearMediaSession(): void {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = null;
  try {
    navigator.mediaSession.setActionHandler("play", null);
    navigator.mediaSession.setActionHandler("pause", null);
    navigator.mediaSession.setActionHandler("previoustrack", null);
    navigator.mediaSession.setActionHandler("nexttrack", null);
  } catch {}
}

let autoplayBannerShown = false;

export function showAutoplayBanner(): boolean {
  if (autoplayBannerShown) return false;
  autoplayBannerShown = true;
  return true;
}

export function resetAutoplayBanner(): void {
  autoplayBannerShown = false;
}
