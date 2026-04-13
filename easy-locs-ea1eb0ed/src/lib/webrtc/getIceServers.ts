import { db as supabase } from "@/services/db";

export type IceServerResponse = {
  ok: boolean;
  mode?: "metered" | "coturn";
  ttlSeconds?: number;
  reason?: string;
  iceServers: RTCIceServer[];
};

let cachedIceServers: RTCIceServer[] | null = null;
let cachedUntil = 0;

const FALLBACK_ICE: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

export async function getIceServers(forceRefresh = false): Promise<RTCIceServer[]> {
  const now = Date.now();
  if (!forceRefresh && cachedIceServers && now < cachedUntil) {
    return cachedIceServers;
  }

  try {
    const { data, error } = await supabase.functions.invoke("get-turn-credentials", {
      body: { purpose: "orbit_call" },
    });

    if (error || !data?.iceServers?.length) {
      console.warn("[getIceServers] TURN fetch failed, using STUN fallback", error);
      cachedIceServers = FALLBACK_ICE;
      cachedUntil = now + 5 * 60_000;
      return FALLBACK_ICE;
    }

    const result = data as IceServerResponse;
    const ttl = Math.max(60, Math.min(result.ttlSeconds ?? 600, 3600));
    cachedIceServers = result.iceServers;
    cachedUntil = now + ttl * 1000 - 15_000;

    console.info("[getIceServers] loaded", {
      mode: result.mode,
      count: result.iceServers.length,
      ttl,
    });

    return cachedIceServers;
  } catch (err) {
    console.warn("[getIceServers] Exception, using STUN fallback", err);
    cachedIceServers = FALLBACK_ICE;
    cachedUntil = now + 5 * 60_000;
    return FALLBACK_ICE;
  }
}

export function clearIceServerCache() {
  cachedIceServers = null;
  cachedUntil = 0;
}
