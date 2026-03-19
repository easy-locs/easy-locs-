/**
 * WebRTC ICE configuration — fetches from rtc_config table with STUN fallback.
 */
import { supabase } from "@/integrations/supabase/client";

export async function getRtcConfiguration(): Promise<RTCConfiguration> {
  const fallback: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  try {
    const { data } = await (supabase as any)
      .from("rtc_config")
      .select("*")
      .eq("enabled", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data?.ice_servers) return fallback;

    return {
      iceServers: data.ice_servers,
      iceTransportPolicy: data.ice_transport_policy ?? "all",
    };
  } catch {
    return fallback;
  }
}
