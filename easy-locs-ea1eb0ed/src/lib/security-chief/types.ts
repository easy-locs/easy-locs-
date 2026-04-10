export type SecurityDomain =
  | "device"
  | "chat"
  | "calls"
  | "wallet"
  | "ghost"
  | "qr"
  | "signaling"
  | "backend";

export type SecurityTier = "v1" | "v2" | "v3";

export type AuditLevel = "internal" | "external" | "formal-review";

export interface SignedEnvelope<T = Record<string, unknown>> {
  version: 1;
  domain: SecurityDomain;
  payload: T;
  issuedAt: string;
  nonce: string;
  keyId: string;
  deviceId: string;
  signature?: string;
}

export interface ReplayRecord {
  nonce: string;
  domain: SecurityDomain;
  createdAt: string;
  expiresAt: string;
}

export interface DeviceAttestationRecord {
  deviceId: string;
  deviceFingerprint: string;
  publicKeyFingerprint: string;
  firstSeenAt: string;
  lastSeenAt: string;
  revokedAt?: string | null;
  trustState: "trusted" | "pending_review" | "revoked";
}

export interface KeyRotationPolicy {
  domain: SecurityDomain;
  rotateEveryHours: number;
  keepPreviousHours: number;
  maxActiveKeys: number;
}

export interface SecurityReviewRecord {
  id: string;
  scope: string;
  auditLevel: AuditLevel;
  createdAt: string;
  createdBy: string;
  findings: string[];
  status: "open" | "accepted" | "mitigated" | "closed";
}

export interface TurnServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface HardenedRtcConfig {
  iceServers: TurnServerConfig[];
  iceTransportPolicy: RTCIceTransportPolicy;
  bundlePolicy?: RTCBundlePolicy;
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
}

export interface SecurityChiefConfig {
  tier: SecurityTier;
  allowExportableChatKeys: boolean;
  requireWalletBiometric: boolean;
  requireReplayProtection: boolean;
  requireDeviceAttestation: boolean;
  requireSignedSignals: boolean;
  enablePostQuantumReadyFields: boolean;
  auditLevel: AuditLevel;
}

export interface NativeSecureStoreAdapter {
  isAvailable(): Promise<boolean>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface BackendSecurityContract {
  submitReview(record: Omit<SecurityReviewRecord, "id" | "createdAt">): Promise<SecurityReviewRecord>;
  registerDeviceAttestation(record: DeviceAttestationRecord): Promise<void>;
  fetchTrustedDevice(deviceId: string): Promise<DeviceAttestationRecord | null>;
  consumeNonce(nonce: string, domain: SecurityDomain): Promise<boolean>;
  issueTurnConfig(): Promise<HardenedRtcConfig>;
}
