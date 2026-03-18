/**
 * Orbit call starter — create and send offer via signaling.
 */
import { sendSignal } from "@/lib/orbit/signaling";

export async function startOutgoingCall(params: {
  pc: RTCPeerConnection;
  callSessionId: string;
  userId?: string;
  workspaceId?: string;
}) {
  const offer = await params.pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await params.pc.setLocalDescription(offer);
  await sendSignal({
    callSessionId: params.callSessionId,
    senderId: params.userId,
    workspaceId: params.workspaceId,
    type: "offer",
    payload: offer,
  });
}
