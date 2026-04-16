/**
 * Guest Call — ICE server configuration.
 * Fetches TURN credentials from the server-side edge function.
 * No TURN secrets are bundled in the client.
 */

const STUN_ONLY_FALLBACK: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

let _cachedIceServers: RTCIceServer[] | null = null;
let _cacheExpiry = 0;
let _turnAvailable = false;

export function isTurnAvailable(): boolean {
  return _turnAvailable;
}

export async function getIceServers(): Promise<RTCIceServer[]> {
  if (_cachedIceServers && Date.now() < _cacheExpiry) {
    return _cachedIceServers;
  }

  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!projectId || !apikey) {
      console.warn("[GuestICE] Missing Supabase config, using STUN-only fallback");
      _turnAvailable = false;
      return STUN_ONLY_FALLBACK;
    }

    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/get-turn-credentials`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey,
        },
      }
    );

    if (!res.ok) {
      console.warn("[GuestICE] TURN fetch failed:", res.status);
      _turnAvailable = false;
      return STUN_ONLY_FALLBACK;
    }

    const data = await res.json();
    if (!data?.iceServers?.length) {
      console.warn("[GuestICE] No ICE servers in response, using STUN-only fallback");
      _turnAvailable = false;
      return STUN_ONLY_FALLBACK;
    }

    _turnAvailable = data.turnAvailable === true;

    console.info("[GuestICE] Credentials loaded", {
      provider: data.provider,
      turnAvailable: _turnAvailable,
      serverCount: data.iceServers.length,
      ttl: data.ttlSeconds,
    });

    if (!_turnAvailable) {
      console.warn(
        "[GuestICE] No TURN relay servers available — calls on restricted networks (e.g. UAE/GCC corporate firewalls) may fail"
      );
    }

    const ttl = Math.max(60, Math.min(data.ttlSeconds ?? data.ttl ?? 300, 3600));
    _cachedIceServers = data.iceServers;
    _cacheExpiry = Date.now() + ttl * 1000 - 15_000;
    return _cachedIceServers;
  } catch (err) {
    console.warn("[GuestICE] TURN fetch error, using STUN-only fallback", err);
    _turnAvailable = false;
    return STUN_ONLY_FALLBACK;
  }
}

export function clearIceServerCache() {
  _cachedIceServers = null;
  _cacheExpiry = 0;
  _turnAvailable = false;
}

export const ICE_TIMEOUT_MS = 15_000;
export const STREAM_TIMEOUT_MS = 25_000;
