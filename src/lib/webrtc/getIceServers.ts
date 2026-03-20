import { supabase } from "@/integrations/supabase/client";

type IceConfigResponse = {
  username: string;
  credential: string;
  ttlSeconds: number;
  iceServers: RTCIceServer[];
};

let cachedIceServers: RTCIceServer[] | null = null;
let cachedUntil = 0;

/** Fallback STUN-only config when TURN is unavailable */
const FALLBACK_ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * Fetches ephemeral TURN credentials from the backend function.
 * Falls back to STUN-only if the function is not configured yet.
 * Caches results for most of the TTL to avoid re-fetching every call.
 */
export async function getIceServers(): Promise<RTCIceServer[]> {
  const now = Date.now();
  if (cachedIceServers && now < cachedUntil) {
    return cachedIceServers;
  }

  try {
    const { data, error } = await supabase.functions.invoke("turn-credentials", {
      body: {},
    });

    if (error || !data?.iceServers) {
      console.warn("[getIceServers] TURN fetch failed, using STUN fallback", error);
      return FALLBACK_ICE;
    }

    const result = data as IceConfigResponse;
    cachedIceServers = result.iceServers;
    // Cache for TTL minus 60s safety margin, minimum 5 minutes
    cachedUntil = now + Math.max(300_000, (result.ttlSeconds - 60) * 1000);

    return cachedIceServers;
  } catch (err) {
    console.warn("[getIceServers] Exception, using STUN fallback", err);
    return FALLBACK_ICE;
  }
}
