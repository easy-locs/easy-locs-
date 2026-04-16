const MUX_API_BASE = "https://api.mux.com";

function getMuxCredentials(): { tokenId: string; tokenSecret: string } {
  const tokenId = Deno.env.get("MUX_TOKEN_ID");
  const tokenSecret = Deno.env.get("MUX_TOKEN_SECRET");
  if (!tokenId || !tokenSecret) {
    throw new Error("MUX_TOKEN_ID and MUX_TOKEN_SECRET must be configured");
  }
  return { tokenId, tokenSecret };
}

function getAuthHeader(): string {
  const { tokenId, tokenSecret } = getMuxCredentials();
  return `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`;
}

export interface MuxAsset {
  id: string;
  status: string;
  playback_ids: Array<{ id: string; policy: string }>;
  duration: number;
  max_stored_resolution: string;
  created_at: string;
}

export interface MuxUploadResponse {
  id: string;
  url: string;
  new_asset_settings: { playback_policy: string[] };
}

export async function createMuxUploadUrl(options?: {
  playbackPolicy?: "public" | "signed";
  maxDurationSeconds?: number;
}): Promise<MuxUploadResponse> {
  const response = await fetch(`${MUX_API_BASE}/video/v1/uploads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: [options?.playbackPolicy ?? "public"],
        encoding_tier: "baseline",
        max_resolution_tier: "1080p",
      },
      ...(options?.maxDurationSeconds && {
        timeout: options.maxDurationSeconds,
      }),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mux upload creation failed [${response.status}]: ${err}`);
  }

  const data = await response.json();
  return data.data;
}

export async function getMuxAsset(assetId: string): Promise<MuxAsset> {
  const response = await fetch(`${MUX_API_BASE}/video/v1/assets/${assetId}`, {
    headers: { Authorization: getAuthHeader() },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mux asset fetch failed [${response.status}]: ${err}`);
  }

  const data = await response.json();
  return data.data;
}

export async function deleteMuxAsset(assetId: string): Promise<void> {
  const response = await fetch(`${MUX_API_BASE}/video/v1/assets/${assetId}`, {
    method: "DELETE",
    headers: { Authorization: getAuthHeader() },
  });

  if (!response.ok && response.status !== 404) {
    const err = await response.text();
    throw new Error(`Mux asset deletion failed [${response.status}]: ${err}`);
  }
}

export function getMuxStreamUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function getMuxThumbnailUrl(
  playbackId: string,
  options?: { width?: number; height?: number; time?: number; format?: "jpg" | "png" | "gif" }
): string {
  const params = new URLSearchParams();
  if (options?.width) params.set("width", String(options.width));
  if (options?.height) params.set("height", String(options.height));
  if (options?.time !== undefined) params.set("time", String(options.time));
  const ext = options?.format ?? "jpg";
  const qs = params.toString();
  return `https://image.mux.com/${playbackId}/thumbnail.${ext}${qs ? `?${qs}` : ""}`;
}

export async function createMuxLiveStream(): Promise<{
  streamKey: string;
  playbackId: string;
  liveStreamId: string;
}> {
  const response = await fetch(`${MUX_API_BASE}/video/v1/live-streams`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({
      playback_policy: ["public"],
      new_asset_settings: { playback_policy: ["public"] },
      reduced_latency: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mux live stream creation failed [${response.status}]: ${err}`);
  }

  const data = await response.json();
  const stream = data.data;
  return {
    streamKey: stream.stream_key,
    playbackId: stream.playback_ids?.[0]?.id ?? "",
    liveStreamId: stream.id,
  };
}
