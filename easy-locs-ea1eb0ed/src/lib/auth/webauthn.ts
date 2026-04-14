import * as biometricRepo from "@/repositories/biometric.repository";

export type WebAuthnLoginResult = {
  success: boolean;
  error?: string;
  actionLink?: string;
  userId?: string;
  loginMethod?: string;
};

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof PublicKeyCredential !== "undefined" &&
    typeof navigator.credentials !== "undefined"
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function registerCredential(deviceName?: string): Promise<{ success: boolean; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: "WebAuthn is not supported on this device" };
  }

  try {
    const { options } = await biometricRepo.getRegistrationChallenge();

    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge: base64urlToBuffer(options.challenge),
      rp: options.rp,
      user: {
        ...options.user,
        id: base64urlToBuffer(options.user.id),
      },
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      attestation: options.attestation as AttestationConveyancePreference,
      authenticatorSelection: options.authenticatorSelection,
      excludeCredentials: (options.excludeCredentials || []).map(
        (c: { id: string; type: string; transports?: string[] }) => ({
          ...c,
          id: base64urlToBuffer(c.id),
        })
      ),
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: "Credential creation was cancelled" };
    }

    const result = await biometricRepo.verifyRegistration(credential, deviceName);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof DOMException) {
      if (err.name === "NotAllowedError") {
        return { success: false, error: "Biometric verification was cancelled or timed out" };
      }
      if (err.name === "InvalidStateError") {
        return { success: false, error: "This device is already registered" };
      }
    }
    const message = err instanceof Error ? err.message : "Registration failed";
    return { success: false, error: message };
  }
}

export async function authenticateCredential(): Promise<{ success: boolean; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: "WebAuthn is not supported on this device" };
  }

  try {
    const { options, error: challengeError } = await biometricRepo.getAuthenticationChallenge();

    if (challengeError) {
      return { success: false, error: challengeError };
    }

    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge: base64urlToBuffer(options.challenge),
      rpId: options.rpId,
      timeout: options.timeout,
      userVerification: options.userVerification as UserVerificationRequirement,
      allowCredentials: (options.allowCredentials || []).map(
        (c: { id: string; type: string; transports?: string[] }) => ({
          ...c,
          id: base64urlToBuffer(c.id),
        })
      ),
    };

    const credential = (await navigator.credentials.get({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: "Authentication was cancelled" };
    }

    const result = await biometricRepo.verifyAuthentication(credential);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      return { success: false, error: "Biometric verification was cancelled or timed out" };
    }
    const message = err instanceof Error ? err.message : "Authentication failed";
    return { success: false, error: message };
  }
}

export async function loginWithWebAuthn(
  identifier: { email?: string; phone?: string }
): Promise<WebAuthnLoginResult> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: "WebAuthn is not supported on this device" };
  }

  try {
    const challengeData = await biometricRepo.getLoginChallenge(identifier);

    if (challengeData.error) {
      return { success: false, error: challengeData.error };
    }

    const { options, userId } = challengeData;

    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge: base64urlToBuffer(options.challenge),
      rpId: options.rpId,
      timeout: options.timeout,
      userVerification: options.userVerification as UserVerificationRequirement,
      allowCredentials: (options.allowCredentials || []).map(
        (c: { id: string; type: string; transports?: string[] }) => ({
          ...c,
          id: base64urlToBuffer(c.id),
        })
      ),
    };

    const credential = (await navigator.credentials.get({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: "Authentication was cancelled" };
    }

    const result = await biometricRepo.verifyLogin(credential, userId);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      actionLink: result.actionLink,
      userId: result.userId,
      loginMethod: result.loginMethod,
    };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      return { success: false, error: "Biometric verification was cancelled or timed out" };
    }
    const message = err instanceof Error ? err.message : "Login failed";
    return { success: false, error: message };
  }
}
