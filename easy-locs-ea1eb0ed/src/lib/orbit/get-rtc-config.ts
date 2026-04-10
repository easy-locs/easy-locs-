/**
 * WebRTC ICE config loader — fetches TURN credentials from edge function.
 * No longer queries rtc_config table directly.
 */
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
};

export async function getRTCConfig(): Promise<RTCConfiguration> {
  try {
    const { data, error } = await supabase.functions.invoke("get-turn-credentials");
    if (error || !data?.iceServers) return FALLBACK_CONFIG;
    return { iceServers: data.iceServers };
  } catch {
    return FALLBACK_CONFIG;
  }
}
