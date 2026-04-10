/**
 * ICE server configuration — fetches TURN credentials from backend.
 */
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

let _cachedIceServers: RTCIceServer[] | null = null;
let _cacheExpiry = 0;

export async function getIceServers(): Promise<RTCIceServer[]> {
  if (_cachedIceServers && Date.now() < _cacheExpiry) {
    return _cachedIceServers;
  }

  try {
    const { data, error } = await supabase.functions.invoke("get-turn-credentials");
    if (error || !data?.iceServers) {
      console.warn("[ICE] Failed to fetch TURN credentials, using STUN-only fallback", error);
      return FALLBACK_ICE_SERVERS;
    }
    _cachedIceServers = data.iceServers;
    _cacheExpiry = Date.now() + 5 * 60 * 1000;
    return _cachedIceServers;
  } catch (err) {
    console.warn("[ICE] TURN fetch error, using STUN-only fallback", err);
    return FALLBACK_ICE_SERVERS;
  }
}
