import { decode as cborDecode } from "npm:cbor-x@1.5.9";

export interface ParsedAttestationResult {
  rpIdHash: Uint8Array;
  flags: number;
  signCount: number;
  credentialId: Uint8Array;
  publicKeyJwk: JsonWebKey;
  publicKeyAlg: number;
}

export interface ParsedAuthenticatorData {
  rpIdHash: Uint8Array;
  flags: number;
  userPresent: boolean;
  userVerified: boolean;
  signCount: number;
}

export function parseAttestationObject(attestationB64: string): ParsedAttestationResult {
  const attestationBytes = Uint8Array.from(atob(attestationB64), (c) => c.charCodeAt(0));
  const decoded = cborDecode(attestationBytes) as {
    fmt: string;
    attStmt: Record<string, unknown>;
    authData: Uint8Array;
  };

  const authData = decoded.authData;
  if (!authData || authData.length < 37) {
    throw new Error("Invalid authData in attestation object");
  }

  const rpIdHash = authData.slice(0, 32);
  const flags = authData[32];
  const signCount =
    (authData[33] << 24) | (authData[34] << 16) | (authData[35] << 8) | authData[36];

  const hasAttestedCredData = (flags & 0x40) !== 0;
  if (!hasAttestedCredData) {
    throw new Error("Attestation does not contain credential data");
  }

  let offset = 37;
  offset += 16;

  const credIdLen = (authData[offset] << 8) | authData[offset + 1];
  offset += 2;

  const credentialId = authData.slice(offset, offset + credIdLen);
  offset += credIdLen;

  const coseKeyBytes = authData.slice(offset);
  const coseKey = cborDecode(coseKeyBytes) as Map<number, unknown>;

  const kty = coseKey.get(1) as number;
  const alg = coseKey.get(3) as number;

  let publicKeyJwk: JsonWebKey;

  if (kty === 2 && alg === -7) {
    const x = coseKey.get(-2) as Uint8Array;
    const y = coseKey.get(-3) as Uint8Array;
    if (!x || !y || x.length !== 32 || y.length !== 32) {
      throw new Error("Invalid EC2 key coordinates");
    }
    publicKeyJwk = {
      kty: "EC",
      crv: "P-256",
      x: uint8ArrayToBase64Url(x),
      y: uint8ArrayToBase64Url(y),
    };
  } else if (kty === 3 && alg === -257) {
    const n = coseKey.get(-1) as Uint8Array;
    const e = coseKey.get(-2) as Uint8Array;
    if (!n || !e) {
      throw new Error("Invalid RSA key parameters");
    }
    publicKeyJwk = {
      kty: "RSA",
      n: uint8ArrayToBase64Url(n),
      e: uint8ArrayToBase64Url(e),
    };
  } else {
    throw new Error(`Unsupported key type: kty=${kty}, alg=${alg}`);
  }

  return {
    rpIdHash,
    flags,
    signCount,
    credentialId,
    publicKeyJwk,
    publicKeyAlg: alg,
  };
}

export function parseAuthenticatorData(authDataB64: string): ParsedAuthenticatorData {
  const rawData = Uint8Array.from(atob(authDataB64), (c) => c.charCodeAt(0));
  if (rawData.length < 37) {
    throw new Error("Invalid authenticator data length");
  }

  return {
    rpIdHash: rawData.slice(0, 32),
    flags: rawData[32],
    userPresent: (rawData[32] & 0x01) !== 0,
    userVerified: (rawData[32] & 0x04) !== 0,
    signCount:
      (rawData[33] << 24) | (rawData[34] << 16) | (rawData[35] << 8) | rawData[36],
  };
}

export async function verifyRpIdHash(
  rpIdHash: Uint8Array,
  expectedRpId: string
): Promise<boolean> {
  const expectedHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(expectedRpId))
  );
  if (rpIdHash.length !== expectedHash.length) return false;
  for (let i = 0; i < 32; i++) {
    if (rpIdHash[i] !== expectedHash[i]) return false;
  }
  return true;
}

export async function verifyAssertionSignature(
  authenticatorDataB64: string,
  clientDataJSONB64: string,
  signatureB64: string,
  publicKeyJwk: JsonWebKey,
  alg: number
): Promise<boolean> {
  const authenticatorData = Uint8Array.from(
    atob(authenticatorDataB64),
    (c) => c.charCodeAt(0)
  );
  const clientDataJSON = Uint8Array.from(
    atob(clientDataJSONB64),
    (c) => c.charCodeAt(0)
  );
  const signature = Uint8Array.from(atob(signatureB64), (c) => c.charCodeAt(0));

  const clientDataHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", clientDataJSON)
  );

  const signedData = new Uint8Array(authenticatorData.length + clientDataHash.length);
  signedData.set(authenticatorData);
  signedData.set(clientDataHash, authenticatorData.length);

  let algorithm: RsaHashedImportParams | EcKeyImportParams;
  let verifyAlgorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams;

  if (alg === -7) {
    algorithm = { name: "ECDSA", namedCurve: "P-256" };
    verifyAlgorithm = { name: "ECDSA", hash: "SHA-256" };
  } else if (alg === -257) {
    algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
    verifyAlgorithm = { name: "RSASSA-PKCS1-v1_5" };
  } else {
    throw new Error(`Unsupported algorithm: ${alg}`);
  }

  const key = await crypto.subtle.importKey("jwk", publicKeyJwk, algorithm, false, [
    "verify",
  ]);

  let sigToVerify = signature;
  if (alg === -7) {
    sigToVerify = derToRaw(signature);
  }

  return crypto.subtle.verify(verifyAlgorithm, key, sigToVerify, signedData);
}

function derToRaw(derSig: Uint8Array): Uint8Array {
  if (derSig[0] !== 0x30) return derSig;

  let offset = 2;
  if (derSig[1] & 0x80) offset += (derSig[1] & 0x7f);

  if (derSig[offset] !== 0x02) return derSig;
  const rLen = derSig[offset + 1];
  offset += 2;
  let r = derSig.slice(offset, offset + rLen);
  offset += rLen;

  if (derSig[offset] !== 0x02) return derSig;
  const sLen = derSig[offset + 1];
  offset += 2;
  let s = derSig.slice(offset, offset + sLen);

  if (r.length > 32) r = r.slice(r.length - 32);
  if (s.length > 32) s = s.slice(s.length - 32);

  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  return raw;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function getExpectedOrigin(): string {
  return Deno.env.get("WEBAUTHN_ORIGIN") || Deno.env.get("APP_URL") || "https://localhost";
}

export function getExpectedRpId(): string {
  const origin = getExpectedOrigin();
  try {
    return new URL(origin).hostname;
  } catch {
    return "localhost";
  }
}
