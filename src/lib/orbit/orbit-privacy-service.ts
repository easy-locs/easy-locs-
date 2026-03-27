export function canSendReadReceipts(settings: any) {
  return !!settings?.read_receipts;
}

export function canBroadcastTyping(settings: any) {
  return !!settings?.typing_indicators;
}

export function getDefaultDisappearSeconds(settings: any) {
  return Number(settings?.disappear_default_seconds || 0);
}

export function isGhostModeEnabled(settings: any) {
  return !!settings?.ghost_mode_enabled;
}

export function canUseCalls(settings: any) {
  return !!settings?.calls_enabled;
}

export function canUseCameraUploads(settings: any) {
  return !!settings?.camera_uploads_enabled;
}

export function canShareLocation(settings: any) {
  return !!settings?.location_sharing_enabled;
}
