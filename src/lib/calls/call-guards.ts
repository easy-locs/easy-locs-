/**
 * Call Guards — Browser capability checks before starting calls.
 */

export function assertMediaSupport() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Media devices are not supported on this browser");
  }
  if (typeof RTCPeerConnection === "undefined") {
    throw new Error("WebRTC is not supported on this browser");
  }
}

/** Quick check that media devices are available before call UI */
export function assertCallReady() {
  if (!navigator.mediaDevices) {
    throw new Error("Media devices not available");
  }
}
