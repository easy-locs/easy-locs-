import type { SecurityDomain } from "./types";
import { getCurrentDomainKeyMeta, getDomainKey } from "./domain-keys";
import { nowIso, randomNonce, toBase64, fromBase64 } from "./utils";

export interface SecureEnvelopeV2 {
  version: 2;
  domain: SecurityDomain;
  keyId: string;
  issuedAt: string;
  nonce: string;
  iv: string;
  ciphertext: string;
  aad?: string;
  pqHint?: string | null;
}

export async function encryptEnvelope(params: {
  domain: SecurityDomain;
  plaintext: string;
  aad?: string;
}): Promise<SecureEnvelopeV2> {
  const meta = await getCurrentDomainKeyMeta(params.domain);
  if (!meta) throw new Error(`No current key for domain: ${params.domain}`);

  const key = await getDomainKey(params.domain, meta.keyId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(params.plaintext);

  const cipher = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: params.aad ? new TextEncoder().encode(params.aad) : undefined,
    },
    key,
    data
  );

  return {
    version: 2,
    domain: params.domain,
    keyId: meta.keyId,
    issuedAt: nowIso(),
    nonce: randomNonce(),
    iv: toBase64(iv),
    ciphertext: toBase64(cipher),
    aad: params.aad,
    pqHint: null,
  };
}

export async function decryptEnvelope(envelope: SecureEnvelopeV2): Promise<string> {
  const key = await getDomainKey(envelope.domain, envelope.keyId);

  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(envelope.iv).buffer as ArrayBuffer,
      additionalData: envelope.aad ? new TextEncoder().encode(envelope.aad) : undefined,
    },
    key,
    fromBase64(envelope.ciphertext).buffer as ArrayBuffer
  );

  return new TextDecoder().decode(plain);
}
