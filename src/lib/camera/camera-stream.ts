import { requestMediaStream } from "@/lib/device/permissions";

export type CameraOpenMode = "qr" | "call" | "proof" | "avatar";

export async function openCameraStream(mode: CameraOpenMode) {
  const useRear = mode === "qr" || mode === "proof";
  const videoConstraints: MediaTrackConstraints = useRear
    ? { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
    : { facingMode: "user" };

  return requestMediaStream({
    camera: true,
    microphone: mode === "call",
    videoConstraints,
  });
}

export function stopCameraStream(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}
