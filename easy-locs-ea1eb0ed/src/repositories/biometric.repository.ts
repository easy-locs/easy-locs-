import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function getRegistrationChallenge() {
  const { data, error } = await db.functions.invoke("webauthn-registration-challenge");
  if (error) throw error;
  return data;
}

export async function verifyRegistration(credential: PublicKeyCredential, deviceName?: string) {
  const response = credential.response as AuthenticatorAttestationResponse;
  const { data, error } = await db.functions.invoke("webauthn-registration-verify", {
    body: {
      credential: {
        id: credential.id,
        rawId: arrayBufferToBase64(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
          attestationObject: arrayBufferToBase64(response.attestationObject),
          transports: response.getTransports?.() || ["internal"],
        },
      },
      deviceName,
    },
  });
  if (error) throw error;
  return data;
}

export async function getAuthenticationChallenge() {
  const { data, error } = await db.functions.invoke("webauthn-authentication-challenge");
  if (error) throw error;
  return data;
}

export async function verifyAuthentication(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAssertionResponse;
  const { data, error } = await db.functions.invoke("webauthn-authentication-verify", {
    body: {
      credential: {
        id: credential.id,
        rawId: arrayBufferToBase64(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
          authenticatorData: arrayBufferToBase64(response.authenticatorData),
          signature: arrayBufferToBase64(response.signature),
          userHandle: response.userHandle ? arrayBufferToBase64(response.userHandle) : null,
        },
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function getLoginChallenge(identifier: { email?: string; phone?: string }) {
  const { data, error } = await db.functions.invoke("webauthn-login-challenge", {
    body: identifier,
  });
  if (error) throw error;
  return data;
}

export async function verifyLogin(credential: PublicKeyCredential, userId: string) {
  const response = credential.response as AuthenticatorAssertionResponse;
  const { data, error } = await db.functions.invoke("webauthn-login-verify", {
    body: {
      userId,
      credential: {
        id: credential.id,
        rawId: arrayBufferToBase64(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
          authenticatorData: arrayBufferToBase64(response.authenticatorData),
          signature: arrayBufferToBase64(response.signature),
          userHandle: response.userHandle ? arrayBufferToBase64(response.userHandle) : null,
        },
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function getUserCredentials() {
  const { data, error } = await cFrom("webauthn_credentials")
    .select("id, credential_id, device_name, created_at, last_used_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteCredential(credentialDbId: string) {
  const { error } = await cFrom("webauthn_credentials")
    .delete()
    .eq("id", credentialDbId);
  if (error) throw error;
}

export async function getBiometricStatus(): Promise<boolean> {
  const { data, error } = await cFrom("profiles")
    .select("biometric_enabled")
    .single();
  if (error) throw error;
  return data?.biometric_enabled ?? false;
}

export async function setBiometricEnabled(enabled: boolean) {
  const { data: { user } } = await db.auth.getUser();
  if (!user?.id) throw new Error("Not authenticated");
  const { error } = await cFrom("profiles")
    .update({ biometric_enabled: enabled })
    .eq("id", user.id);
  if (error) throw error;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
