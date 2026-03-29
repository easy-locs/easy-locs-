/**
 * FAMILY: DEVICE — Canonical device abstraction layer.
 * Single source of truth for all browser/device API interactions.
 * Components MUST use these families instead of raw navigator/Notification/Audio APIs.
 */

export { DeviceHaptics } from "./device-haptics";
export { DevicePermissions } from "./device-permissions";
export { DeviceAudio } from "./device-audio";

// Device family owns: vibration, permissions, audio context, visibility, haptics.
// No component should call navigator.vibrate, new Notification, or new Audio directly.
