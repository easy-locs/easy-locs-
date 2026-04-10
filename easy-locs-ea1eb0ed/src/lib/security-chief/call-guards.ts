export async function assertMediaSupport(params: { video?: boolean } = {}) {
  if (!window.RTCPeerConnection) {
    throw new Error("RTCPeerConnection missing");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia missing");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: !!params.video,
  });

  stream.getTracks().forEach((t) => t.stop());
  return true;
}
