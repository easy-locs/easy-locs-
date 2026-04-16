export interface MuxPlayerConfig {
  playbackId: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  poster?: string;
}

export function getMuxStreamUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function getMuxThumbnailUrl(
  playbackId: string,
  options?: { width?: number; height?: number; time?: number }
): string {
  const params = new URLSearchParams();
  if (options?.width) params.set("width", String(options.width));
  if (options?.height) params.set("height", String(options.height));
  if (options?.time !== undefined) params.set("time", String(options.time));
  const qs = params.toString();
  return `https://image.mux.com/${playbackId}/thumbnail.jpg${qs ? `?${qs}` : ""}`;
}

export function getMuxGifUrl(
  playbackId: string,
  options?: { width?: number; start?: number; end?: number; fps?: number }
): string {
  const params = new URLSearchParams();
  if (options?.width) params.set("width", String(options.width));
  if (options?.start !== undefined) params.set("start", String(options.start));
  if (options?.end !== undefined) params.set("end", String(options.end));
  if (options?.fps) params.set("fps", String(options.fps));
  const qs = params.toString();
  return `https://image.mux.com/${playbackId}/animated.gif${qs ? `?${qs}` : ""}`;
}

export function getMuxStoryboardUrl(playbackId: string): string {
  return `https://image.mux.com/${playbackId}/storyboard.vtt`;
}

export async function requestMuxUploadUrl(): Promise<{
  uploadUrl: string;
  uploadId: string;
} | null> {
  try {
    const muxTokenId = import.meta.env.VITE_MUX_TOKEN_ID;
    if (!muxTokenId) {
      console.warn("[mux] MUX_TOKEN_ID not configured, upload unavailable");
      return null;
    }

    const { callEdgeFunction } = await import("@/lib/edge-client");
    const data = await callEdgeFunction<{ url: string; id: string }>(
      "mux-upload",
      { action: "create_upload" }
    );
    return { uploadUrl: data.url, uploadId: data.id };
  } catch (err) {
    console.warn("[mux] Upload URL request failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function uploadVideoToMux(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

export function createMuxVideoElement(
  playbackId: string,
  container: HTMLElement,
  options?: MuxPlayerConfig
): HTMLVideoElement {
  const video = document.createElement("video");
  video.controls = true;
  video.playsInline = true;
  video.autoplay = options?.autoplay ?? false;
  video.muted = options?.muted ?? false;
  video.loop = options?.loop ?? false;

  if (options?.poster) {
    video.poster = options.poster;
  } else {
    video.poster = getMuxThumbnailUrl(playbackId, { width: 640 });
  }

  const source = document.createElement("source");
  source.src = getMuxStreamUrl(playbackId);
  source.type = "application/x-mpegURL";
  video.appendChild(source);

  container.appendChild(video);
  return video;
}
