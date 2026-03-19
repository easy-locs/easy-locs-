/**
 * Call Guards — Browser capability checks before starting calls.
 */

export async function assertMediaSupport(video = false) {
  if (!window.RTCPeerConnection) {
    throw new Error("WebRTC unsupported");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Media devices unavailable");
  }
  await navigator.mediaDevices.getUserMedia({
    audio: true,
    video,
  });
}
