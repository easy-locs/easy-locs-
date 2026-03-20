import { supabase } from "@/integrations/supabase/client";
import { useDebugCommsStore } from "@/stores/debugCommsStore";

type IceConfigResponse = {
  username: string;
  credential: string;
  ttlSeconds: number;
  iceServers: RTCIceServer[];
};

let cachedIceServers: RTCIceServer[] | null = null;
let cachedUntil = 0;

const FALLBACK_ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export async function getIceServers(): Promise<RTCIceServer[]> {
  const now = Date.now();
  if (cachedIceServers && now < cachedUntil) {
    useDebugCommsStore.getState().setTurn({
      turnFetched: true,
      turnServerCount: cachedIceServers.length,
    });
    return cachedIceServers;
  }

  try {
    const { data, error } = await supabase.functions.invoke("turn-credentials", {
      body: {},
    });

    if (error || !data?.iceServers) {
      console.warn("[getIceServers] TURN fetch failed, using STUN fallback", error);
      useDebugCommsStore.getState().setTurn({ turnFetched: false, turnServerCount: 0 });
      return FALLBACK_ICE;
    }

    const result = data as IceConfigResponse;
    cachedIceServers = result.iceServers;
    cachedUntil = now + Math.max(300_000, (result.ttlSeconds - 60) * 1000);

    useDebugCommsStore.getState().setTurn({
      turnFetched: true,
      turnServerCount: cachedIceServers.length,
    });

    return cachedIceServers;
  } catch (err) {
    console.warn("[getIceServers] Exception, using STUN fallback", err);
    useDebugCommsStore.getState().setTurn({ turnFetched: false, turnServerCount: 0 });
    return FALLBACK_ICE;
  }
}
