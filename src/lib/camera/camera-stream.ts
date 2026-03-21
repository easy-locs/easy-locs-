export type CameraOpenMode = "qr" | "call" | "proof" | "avatar";

export async function openCameraStream(mode: CameraOpenMode) {
  const useRear = mode === "qr" || mode === "proof";
  const videoConstraints: MediaTrackConstraints = useRear
    ? { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
    : { facingMode: "user" };
  const constraints: MediaStreamConstraints =
    mode === "call"
      ? { video: videoConstraints, audio: true }
      : { video: videoConstraints, audio: false };

  return navigator.mediaDevices.getUserMedia(constraints);
}

export function stopCameraStream(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}
