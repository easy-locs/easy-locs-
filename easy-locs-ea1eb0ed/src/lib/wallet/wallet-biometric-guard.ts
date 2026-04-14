import { performBiometricAuthentication, checkBiometricCapability } from "@/lib/auth/biometric";
import { isBiometricUnlockEnabled } from "@/lib/app-security";
import { getBiometricStatus } from "@/repositories/biometric.repository";

export type BiometricGuardResult =
  | { required: false }
  | { required: true; verified: true }
  | { required: true; verified: false; error: string; fallbackToPin: boolean };

export async function guardSensitiveOperation(): Promise<BiometricGuardResult> {
  let enabled = false;
  try {
    enabled = await getBiometricStatus();
  } catch {
    enabled = isBiometricUnlockEnabled();
  }

  if (!enabled) {
    return { required: false };
  }

  const capability = await checkBiometricCapability();
  if (!capability.available) {
    return { required: true, verified: false, error: "Biometric not available", fallbackToPin: true };
  }

  const result = await performBiometricAuthentication();
  if (result.success) {
    return { required: true, verified: true };
  }

  return {
    required: true,
    verified: false,
    error: result.error || "Biometric verification failed",
    fallbackToPin: true,
  };
}
