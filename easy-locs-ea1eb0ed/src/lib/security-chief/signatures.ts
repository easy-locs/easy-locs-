import type { SignedEnvelope } from "./types";
import { ensureSigningIdentityMeta, getSigningPrivateKey, importVerifyKey } from "./device-identity";
import { stableJsonHash, toBase64, fromBase64, randomNonce, nowIso } from "./utils";

export async function signPayload<T extends Record<string, unknown>>(params: {
  domain: SignedEnvelope<T>["domain"];
  keyId: string;
  payload: T;
}): Promise<SignedEnvelope<T>> {
  const meta = await ensureSigningIdentityMeta();
  const privateKey = await getSigningPrivateKey();
  if (!privateKey) throw new Error("Missing device signing key");

  const unsigned: SignedEnvelope<T> = {
    version: 1,
    domain: params.domain,
    payload: params.payload,
    issuedAt: nowIso(),
    nonce: randomNonce(),
    keyId: params.keyId,
    deviceId: meta.deviceId,
  };

  const hash = await stableJsonHash(unsigned);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(hash)
  );

  return {
    ...unsigned,
    signature: toBase64(sig),
  };
}

export async function verifySignedPayload<T extends Record<string, unknown>>(
  envelope: SignedEnvelope<T>,
  publicKeyJwk: JsonWebKey
): Promise<boolean> {
  if (!envelope.signature) return false;

  const verifier = await importVerifyKey(publicKeyJwk);
  const unsigned: SignedEnvelope<T> = {
    ...envelope,
    signature: undefined,
  };
  const hash = await stableJsonHash(unsigned);

  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    verifier,
    fromBase64(envelope.signature).buffer as ArrayBuffer,
    new TextEncoder().encode(hash)
  );
}
