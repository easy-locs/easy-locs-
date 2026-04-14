import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerCredential,
  authenticateCredential,
} from "./webauthn";
import { setBiometricUnlock } from "@/lib/app-security";
import { setBiometricEnabled as persistBiometricEnabled } from "@/repositories/biometric.repository";

export type BiometricType = "face_id" | "touch_id" | "fingerprint" | "webauthn" | "none";

export interface BiometricCapability {
  available: boolean;
  type: BiometricType;
  isNative: boolean;
}

interface CapacitorBiometricPlugin {
  checkBiometry(): Promise<{ isAvailable: boolean }>;
  authenticate(opts: { reason: string; cancelTitle?: string }): Promise<void>;
}

interface CapacitorGlobal {
  Plugins?: {
    BiometricAuth?: CapacitorBiometricPlugin;
  };
}

function getCapacitorGlobal(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  const win = window as Window & { Capacitor?: CapacitorGlobal };
  return win.Capacitor ?? null;
}

function getCapacitorBiometricPlugin(): CapacitorBiometricPlugin | null {
  try {
    const cap = getCapacitorGlobal();
    return cap?.Plugins?.BiometricAuth ?? null;
  } catch {
    return null;
  }
}

function detectBiometricType(): BiometricType {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  if (isIOS) {
    const hasFaceId = /iPhone1[2-9]|iPhone[2-9]\d|iPad(1[3-9]|[2-9]\d)/.test(ua);
    return hasFaceId ? "face_id" : "touch_id";
  }
  if (isAndroid) return "fingerprint";
  return "webauthn";
}

export async function checkBiometricCapability(): Promise<BiometricCapability> {
  const nativePlugin = getCapacitorBiometricPlugin();
  if (nativePlugin) {
    try {
      const result = await nativePlugin.checkBiometry();
      if (result.isAvailable) {
        return {
          available: true,
          type: detectBiometricType(),
          isNative: true,
        };
      }
    } catch {}
  }

  const webAuthnAvailable = await isPlatformAuthenticatorAvailable();
  if (webAuthnAvailable) {
    return {
      available: true,
      type: detectBiometricType(),
      isNative: false,
    };
  }

  return { available: false, type: "none", isNative: false };
}

export async function performBiometricRegistration(
  deviceName?: string
): Promise<{ success: boolean; error?: string }> {
  const capability = await checkBiometricCapability();
  if (!capability.available) {
    return { success: false, error: "Biometric authentication is not available on this device" };
  }

  if (capability.isNative) {
    const plugin = getCapacitorBiometricPlugin();
    if (plugin) {
      try {
        await plugin.authenticate({
          reason: "Verify your identity to enable biometric authentication",
          cancelTitle: "Cancel",
        });

        if (isWebAuthnSupported()) {
          const result = await registerCredential(deviceName);
          if (result.success) {
            await persistBiometricEnabled(true);
            setBiometricUnlock(true);
          }
          return result;
        }

        await persistBiometricEnabled(true);
        setBiometricUnlock(true);
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Native biometric verification failed";
        return { success: false, error: message };
      }
    }
  }

  const result = await registerCredential(deviceName);
  if (result.success) {
    await persistBiometricEnabled(true);
    setBiometricUnlock(true);
  }
  return result;
}

export async function performBiometricAuthentication(): Promise<{ success: boolean; error?: string }> {
  const capability = await checkBiometricCapability();
  if (!capability.available) {
    return { success: false, error: "Biometric authentication is not available on this device" };
  }

  if (capability.isNative) {
    const plugin = getCapacitorBiometricPlugin();
    if (plugin) {
      try {
        await plugin.authenticate({
          reason: "Verify your identity",
          cancelTitle: "Use PIN instead",
        });
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Native biometric verification failed";
        return { success: false, error: message };
      }
    }
  }

  return await authenticateCredential();
}

export function disableBiometricUnlock(): void {
  setBiometricUnlock(false);
}

export function getBiometricLabel(type: BiometricType): string {
  switch (type) {
    case "face_id": return "Face ID";
    case "touch_id": return "Touch ID";
    case "fingerprint": return "Fingerprint";
    case "webauthn": return "Biometric";
    case "none": return "Not available";
  }
}
