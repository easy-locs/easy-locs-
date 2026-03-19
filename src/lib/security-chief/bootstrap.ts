import { ensureSigningIdentityMeta } from "./device-identity";
import { ensureAllKeyRotations } from "./key-rotation";
import { enforceDeviceAttestation } from "./device-attestation";
import { SupabaseBackendSecurityContract } from "./backend-clean-contract";
import { createGhostIdentity } from "./ghost-engine";
import { SECURITY_CHIEF_CONFIG } from "./config";

export async function bootstrapUltraSecureEngine() {
  const backend = new SupabaseBackendSecurityContract();

  const identity = await ensureSigningIdentityMeta();
  await ensureAllKeyRotations();

  let attestationStatus = "skipped";
  if (SECURITY_CHIEF_CONFIG.requireDeviceAttestation) {
    try {
      await enforceDeviceAttestation(backend);
      attestationStatus = "verified";
    } catch (e: any) {
      console.warn("[security-chief] Device attestation failed:", e?.message);
      attestationStatus = "failed";
    }
  }

  const ghostWarmup = createGhostIdentity(1);

  return {
    ready: true,
    deviceId: identity.deviceId,
    publicKeyFingerprint: identity.publicKeyFingerprint,
    attestationStatus,
    ghostWarmup,
    bootedAt: new Date().toISOString(),
  };
}
