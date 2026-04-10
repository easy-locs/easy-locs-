/**
 * FAMILY: DEVICE — Canonical device abstraction layer.
 * Single source of truth for all browser/device API interactions.
 * Components MUST use these families instead of raw navigator/Notification/Audio APIs.
 */

export { DeviceHaptics } from "./device-haptics";
export { DevicePermissions } from "./device-permissions";
export { DeviceAudio } from "./device-audio";

// ── Call Media (canonical pipelines for call device/media) ──
export { CallMediaEngine } from "./call-media-engine";
export { useCallMediaStore } from "./call-media-store";
export type { MicState, OutputState, CameraState, StreamState, CallMediaState } from "./call-media-store";

// Device family owns: vibration, permissions, audio context, visibility, haptics,
// call media pipelines (mic, output, camera, streams, cleanup).
// No component should call navigator.vibrate, new Notification, getUserMedia, or new Audio directly.
