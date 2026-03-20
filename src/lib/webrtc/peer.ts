import { getIceServers } from "@/lib/webrtc/getIceServers";

/**
 * Creates a peer connection with dynamic TURN credentials.
 * Falls back to STUN-only if TURN is not configured.
 */
export async function createPeerConnection(): Promise<RTCPeerConnection> {
  const iceServers = await getIceServers();

  const pc = new RTCPeerConnection({
    iceServers,
    bundlePolicy: "max-bundle",
    iceCandidatePoolSize: 4,
  });

  pc.addEventListener("iceconnectionstatechange", () => {
    console.info("[webrtc] iceConnectionState", pc.iceConnectionState);
  });

  pc.addEventListener("connectionstatechange", () => {
    console.info("[webrtc] connectionState", pc.connectionState);
  });

  return pc;
}
