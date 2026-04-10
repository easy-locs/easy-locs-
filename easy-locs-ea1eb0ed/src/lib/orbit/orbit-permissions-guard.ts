import {
  canUseCalls,
  canUseCameraUploads,
  canShareLocation,
} from "@/lib/orbit/orbit-privacy-service";

export function guardOrbitCall(settings: any) {
  if (!canUseCalls(settings)) {
    throw new Error("Calls are disabled in privacy settings");
  }
}

export function guardOrbitCamera(settings: any) {
  if (!canUseCameraUploads(settings)) {
    throw new Error("Camera uploads are disabled in privacy settings");
  }
}

export function guardOrbitLocation(settings: any) {
  if (!canShareLocation(settings)) {
    throw new Error("Location sharing is disabled in privacy settings");
  }
}
