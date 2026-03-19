/**
 * Get Hardened RTC Configuration — Ephemeral TURN credentials per session.
 */
import { supabase } from "@/integrations/supabase/client";
import { getCallSecurityPolicy, type CallSecurityTier } from "./call-security-policy";

interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
}

let cachedConfig: RTCConfiguration | null = null;
let cachedAt = 0;
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Fetch ephemeral TURN credentials from backend.
 * Falls back to public STUN if backend unavailable.
 */
async function fetchEphemeralTurnCredentials(roomId: string): Promise<TurnCredentials | null> {
  try {
    const { data, error } = await supabase.functions.invoke("get-turn-credentials", {
      body: { room_id: roomId },
    });

    if (error || !data?.urls) {
      console.warn("[call-vault] turn_credentials_fetch_failed", error);
      return null;
    }

    console.log("[call-vault] turn_credentials_loaded", { urls: data.urls.length, ttl: data.ttl });
    return data as TurnCredentials;
  } catch (e) {
    console.warn("[call-vault] turn_credentials_unavailable", e);
    return null;
  }
}

export async function getRtcConfiguration(
  roomId: string,
  tier: CallSecurityTier = "standard"
): Promise<RTCConfiguration> {
  const policy = getCallSecurityPolicy(tier);
  const now = Date.now();

  // Use cache if fresh
  if (cachedConfig && now - cachedAt < CACHE_TTL && !policy.forceRelay) {
    return cachedConfig;
  }

  const iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  // Try to get TURN credentials
  const turn = await fetchEphemeralTurnCredentials(roomId);
  if (turn) {
    iceServers.push({
      urls: turn.urls,
      username: turn.username,
      credential: turn.credential,
    });
  }

  const config: RTCConfiguration = {
    iceServers,
    iceTransportPolicy: policy.forceRelay ? "relay" : "all",
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
  };

  cachedConfig = config;
  cachedAt = now;

  console.log("[call-vault] rtc_config_loaded", {
    servers: iceServers.length,
    transport: config.iceTransportPolicy,
    tier,
  });

  return config;
}

export function refreshTurnCredentialsIfNeeded(roomId: string, tier: CallSecurityTier): void {
  // Force refresh by clearing cache
  cachedConfig = null;
  cachedAt = 0;
  console.log("[call-vault] turn_cache_cleared_for_refresh", { roomId });
}
