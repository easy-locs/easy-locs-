/**
 * Orbit WebRTC peer engine — create connections, offers, answers, attach media.
 */
import { getRTCConfig } from "@/lib/orbit/get-rtc-config";

export async function createOrbitPeerConnection() {
  const rtc = await getRTCConfig();
  return new RTCPeerConnection({
    iceServers: rtc.iceServers,
    iceCandidatePoolSize: 10,
  });
}

export async function createOffer(pc: RTCPeerConnection) {
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await pc.setLocalDescription(offer);
  return offer;
}

export async function createAnswer(pc: RTCPeerConnection) {
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

export async function attachLocalMedia(params: {
  pc: RTCPeerConnection;
  audio?: boolean;
  video?: boolean;
}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: params.audio ?? true,
    video: params.video ?? false,
  });

  stream.getTracks().forEach((track) => {
    params.pc.addTrack(track, stream);
  });

  return stream;
}
