import type { BackendSecurityContract, DeviceAttestationRecord } from "./types";
import { ensureSigningIdentityMeta } from "./device-identity";
import { nowIso, sha256Base64 } from "./utils";

function getBrowserFingerprintSource(): string {
  return [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.platform,
  ].join("|");
}

export async function buildDeviceAttestation(): Promise<DeviceAttestationRecord> {
  const meta = await ensureSigningIdentityMeta();
  const deviceFingerprint = await sha256Base64(getBrowserFingerprintSource());

  return {
    deviceId: meta.deviceId,
    deviceFingerprint,
    publicKeyFingerprint: meta.publicKeyFingerprint,
    firstSeenAt: nowIso(),
    lastSeenAt: nowIso(),
    trustState: "pending_review",
    revokedAt: null,
  };
}

export async function enforceDeviceAttestation(backend: BackendSecurityContract): Promise<DeviceAttestationRecord> {
  const attestation = await buildDeviceAttestation();
  const existing = await backend.fetchTrustedDevice(attestation.deviceId);

  if (!existing) {
    await backend.registerDeviceAttestation(attestation);
    return attestation;
  }

  if (existing.trustState === "revoked") {
    throw new Error("Device revoked");
  }

  if (existing.deviceFingerprint !== attestation.deviceFingerprint) {
    throw new Error("Possible device cloning detected");
  }

  return {
    ...existing,
    lastSeenAt: nowIso(),
  };
}
