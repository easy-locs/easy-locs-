const MEDIA_DENIED_NAMES = new Set(["NotAllowedError", "SecurityError", "PermissionDeniedError"]);
const MEDIA_MISSING_NAMES = new Set(["NotFoundError", "DevicesNotFoundError", "OverconstrainedError"]);
const MEDIA_BUSY_NAMES = new Set(["NotReadableError", "TrackStartError", "AbortError"]);

export function getMediaAccessErrorMessage(error: unknown, opts?: { camera?: boolean; microphone?: boolean }) {
  const domError = error as DOMException | null;
  const wantsCamera = !!opts?.camera;
  const wantsMicrophone = !!opts?.microphone;
  const requested = wantsCamera && wantsMicrophone
    ? "camera and microphone"
    : wantsCamera
      ? "camera"
      : wantsMicrophone
        ? "microphone"
        : "media devices";

  if (!domError?.name) {
    return `Unable to access ${requested}. Please allow access on your phone and browser, then try again.`;
  }

  if (MEDIA_DENIED_NAMES.has(domError.name)) {
    return `Access to ${requested} was denied. Open your phone/browser site permissions and allow it, then try again.`;
  }

  if (MEDIA_MISSING_NAMES.has(domError.name)) {
    return `No ${requested} is available on this device.`;
  }

  if (MEDIA_BUSY_NAMES.has(domError.name)) {
    return `Your ${requested} is already being used by another app or tab. Close it and try again.`;
  }

  return domError.message || `Unable to access ${requested}.`;
}

export async function requestMediaStream(opts: { camera?: boolean; microphone?: boolean; videoConstraints?: MediaTrackConstraints }) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Media devices are unavailable on this device.");
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: opts.camera ? (opts.videoConstraints ?? true) : false,
      audio: opts.microphone ? true : false,
    });
  } catch (error) {
    throw new Error(getMediaAccessErrorMessage(error, { camera: opts.camera, microphone: opts.microphone }));
  }
}

export async function probeMediaAccess(opts: { camera?: boolean; microphone?: boolean; videoConstraints?: MediaTrackConstraints }) {
  const stream = await requestMediaStream(opts);
  stream.getTracks().forEach((track) => track.stop());
  return true;
}

export function getGeoAccessErrorMessage(error: unknown) {
  const geoError = error as GeolocationPositionError | { code?: number; message?: string } | null;

  if (geoError?.code === 1) {
    return "Location access was denied. Open your phone/browser location permission for this site, then tap Retry.";
  }

  if (geoError?.code === 2) {
    return "Location is unavailable right now. Check GPS/network on your phone and try again.";
  }

  if (geoError?.code === 3) {
    return "Location lookup timed out. Move to a clearer area and try again.";
  }

  return geoError?.message || "Location is unavailable.";
}
