import { getIceServers } from "@/lib/webrtc/getIceServers";

/**
 * Creates a peer connection with ephemeral TURN credentials.
 * Falls back to STUN-only if TURN is not configured.
 */
export async function createPeerConnection(): Promise<RTCPeerConnection> {
  const iceServers = await getIceServers();

  return new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
  });
}
