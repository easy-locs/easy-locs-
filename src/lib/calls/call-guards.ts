/**
 * Call Guards — Browser capability checks before starting calls.
 */
import { probeMediaAccess } from "@/lib/device/permissions";

/** Synchronous check — throws if WebRTC basics are missing. */
export function assertCallReady(params?: { video?: boolean }): true {
  if (typeof window === "undefined") {
    throw new Error("Window unavailable");
  }
  if (!window.RTCPeerConnection) {
    throw new Error("WebRTC not supported on this device");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Media devices are unavailable");
  }
  return true;
}

/** Async check — actually requests mic/camera to confirm permissions. */
export async function assertMediaSupport(params?: { video?: boolean }): Promise<true> {
  assertCallReady(params);
  await probeMediaAccess({
    camera: !!params?.video,
    microphone: true,
    videoConstraints: params?.video ? { facingMode: "user" } : undefined,
  });
  return true;
}
