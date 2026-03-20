export type CameraOpenMode = "qr" | "call" | "proof" | "avatar";

export async function openCameraStream(mode: CameraOpenMode) {
  const constraints: MediaStreamConstraints =
    mode === "call"
      ? { video: true, audio: true }
      : { video: true, audio: false };

  return navigator.mediaDevices.getUserMedia(constraints);
}

export function stopCameraStream(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}
