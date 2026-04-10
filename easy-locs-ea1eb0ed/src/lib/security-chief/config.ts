import type { SecurityChiefConfig, KeyRotationPolicy } from "./types";

export const SECURITY_CHIEF_CONFIG: SecurityChiefConfig = {
  tier: "v2",
  allowExportableChatKeys: false,
  requireWalletBiometric: true,
  requireReplayProtection: true,
  requireDeviceAttestation: true,
  requireSignedSignals: true,
  enablePostQuantumReadyFields: true,
  auditLevel: "external",
};

export const KEY_ROTATION_POLICIES: KeyRotationPolicy[] = [
  { domain: "chat", rotateEveryHours: 24, keepPreviousHours: 72, maxActiveKeys: 3 },
  { domain: "calls", rotateEveryHours: 1, keepPreviousHours: 6, maxActiveKeys: 3 },
  { domain: "ghost", rotateEveryHours: 6, keepPreviousHours: 12, maxActiveKeys: 2 },
  { domain: "qr", rotateEveryHours: 1, keepPreviousHours: 2, maxActiveKeys: 2 },
  { domain: "wallet", rotateEveryHours: 720, keepPreviousHours: 720, maxActiveKeys: 2 },
];
