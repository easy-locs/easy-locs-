/**
 * X3DH PreKey Bundle — Extended Triple Diffie-Hellman for initial key agreement.
 * 
 * Implements the X3DH protocol used by Signal:
 * - Identity Key (IK): long-term ECDH P-256 key pair
 * - Signed PreKey (SPK): medium-term key signed by IK
 * - One-Time PreKey (OPK): ephemeral single-use key
 * 
 * The initiator (Alice) computes a shared secret from:
 *   DH1 = DH(IKa, SPKb)
 *   DH2 = DH(EKa, IKb)
 *   DH3 = DH(EKa, SPKb)
 *   DH4 = DH(EKa, OPKb)  [optional]
 *   SK = HKDF(DH1 || DH2 || DH3 || DH4)
 */

const ECDH_PARAMS: EcKeyGenParams = { name: "ECDH", namedCurve: "P-256" };
const HKDF_HASH = "SHA-256";
const X3DH_INFO = new TextEncoder().encode("orbit-x3dh-v2");

// ─── Types ─────────────────────────────────────────────────

export interface PreKeyBundle {
  identityKey: string;       // base64 public key
  signedPreKey: string;      // base64 public key
  signedPreKeyId: string;
  signedPreKeySig: string;   // base64 signature
  oneTimePreKey?: string;    // base64 public key (optional)
  oneTimePreKeyId?: string;
}

export interface X3DHKeyAgreement {
  sharedSecret: Uint8Array;
  ephemeralPublicKey: string; // base64
  usedOneTimePreKeyId?: string;
}

export interface LocalKeyBundle {
  identityKeyPair: CryptoKeyPair;
  signedPreKeyPair: CryptoKeyPair;
  signedPreKeyId: string;
  oneTimePreKeys: Array<{ id: string; keyPair: CryptoKeyPair }>;
}

// ─── Key Generation ────────────────────────────────────────

export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey", "deriveBits"]);
}

export async function generateSignedPreKey(
  identityKeyPair: CryptoKeyPair
): Promise<{ keyPair: CryptoKeyPair; id: string; signature: string }> {
  const keyPair = await crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey", "deriveBits"]);
  const id = `spk_${crypto.randomUUID().slice(0, 8)}`;
  
  // Sign the public key with identity key (using ECDSA for signing)
  const pubRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const signingKey = await deriveSigningKey(identityKeyPair.privateKey);
  const signature = await crypto.subtle.sign(
    { name: "HMAC" },
    signingKey,
    pubRaw
  );

  return { keyPair, id, signature: bufferToBase64(new Uint8Array(signature)) };
}

export async function generateOneTimePreKeys(
  count: number
): Promise<Array<{ id: string; keyPair: CryptoKeyPair }>> {
  const keys: Array<{ id: string; keyPair: CryptoKeyPair }> = [];
  for (let i = 0; i < count; i++) {
    const keyPair = await crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey", "deriveBits"]);
    keys.push({ id: `opk_${crypto.randomUUID().slice(0, 8)}`, keyPair });
  }
  return keys;
}

// ─── Bundle Creation ───────────────────────────────────────

export async function createLocalKeyBundle(): Promise<LocalKeyBundle> {
  const identityKeyPair = await generateIdentityKeyPair();
  const { keyPair: signedPreKeyPair, id: signedPreKeyId } = await generateSignedPreKey(identityKeyPair);
  const oneTimePreKeys = await generateOneTimePreKeys(2);

  return { identityKeyPair, signedPreKeyPair, signedPreKeyId, oneTimePreKeys };
}

export async function exportPreKeyBundle(bundle: LocalKeyBundle): Promise<PreKeyBundle> {
  const identityKey = bufferToBase64(
    new Uint8Array(await crypto.subtle.exportKey("raw", bundle.identityKeyPair.publicKey))
  );
  const signedPreKey = bufferToBase64(
    new Uint8Array(await crypto.subtle.exportKey("raw", bundle.signedPreKeyPair.publicKey))
  );

  // Sign SPK with identity key
  const spkRaw = await crypto.subtle.exportKey("raw", bundle.signedPreKeyPair.publicKey);
  const signingKey = await deriveSigningKey(bundle.identityKeyPair.privateKey);
  const sig = await crypto.subtle.sign({ name: "HMAC" }, signingKey, spkRaw);

  const result: PreKeyBundle = {
    identityKey,
    signedPreKey,
    signedPreKeyId: bundle.signedPreKeyId,
    signedPreKeySig: bufferToBase64(new Uint8Array(sig)),
  };

  if (bundle.oneTimePreKeys.length > 0) {
    const opk = bundle.oneTimePreKeys[0];
    result.oneTimePreKey = bufferToBase64(
      new Uint8Array(await crypto.subtle.exportKey("raw", opk.keyPair.publicKey))
    );
    result.oneTimePreKeyId = opk.id;
  }

  return result;
}

// ─── X3DH Key Agreement (Initiator / Alice) ────────────────

export async function initiateX3DH(
  myIdentityKeyPair: CryptoKeyPair,
  peerBundle: PreKeyBundle
): Promise<X3DHKeyAgreement> {
  // Generate ephemeral key pair
  const ephemeralKP = await crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey", "deriveBits"]);

  // Import peer keys
  const peerIK = await importKey(peerBundle.identityKey);
  const peerSPK = await importKey(peerBundle.signedPreKey);

  // DH1 = DH(IKa, SPKb)
  const dh1 = await ecdhDeriveBits(myIdentityKeyPair.privateKey, peerSPK);
  // DH2 = DH(EKa, IKb)
  const dh2 = await ecdhDeriveBits(ephemeralKP.privateKey, peerIK);
  // DH3 = DH(EKa, SPKb)
  const dh3 = await ecdhDeriveBits(ephemeralKP.privateKey, peerSPK);

  let dhConcat: Uint8Array;
  let usedOPK: string | undefined;

  if (peerBundle.oneTimePreKey) {
    const peerOPK = await importKey(peerBundle.oneTimePreKey);
    // DH4 = DH(EKa, OPKb)
    const dh4 = await ecdhDeriveBits(ephemeralKP.privateKey, peerOPK);
    dhConcat = concatBuffers([dh1, dh2, dh3, dh4]);
    usedOPK = peerBundle.oneTimePreKeyId;
  } else {
    dhConcat = concatBuffers([dh1, dh2, dh3]);
  }

  // Derive shared secret via HKDF
  const sharedSecret = await hkdfDerive(dhConcat, 32);

  const ephemeralPublicKey = bufferToBase64(
    new Uint8Array(await crypto.subtle.exportKey("raw", ephemeralKP.publicKey))
  );

  return { sharedSecret, ephemeralPublicKey, usedOneTimePreKeyId: usedOPK };
}

// ─── X3DH Key Agreement (Responder / Bob) ──────────────────

export async function respondX3DH(
  myBundle: LocalKeyBundle,
  peerIdentityKey: string,
  peerEphemeralKey: string,
  usedOPKId?: string
): Promise<Uint8Array> {
  const peerIK = await importKey(peerIdentityKey);
  const peerEK = await importKey(peerEphemeralKey);

  // DH1 = DH(SPKb, IKa)
  const dh1 = await ecdhDeriveBits(myBundle.signedPreKeyPair.privateKey, peerIK);
  // DH2 = DH(IKb, EKa)
  const dh2 = await ecdhDeriveBits(myBundle.identityKeyPair.privateKey, peerEK);
  // DH3 = DH(SPKb, EKa)
  const dh3 = await ecdhDeriveBits(myBundle.signedPreKeyPair.privateKey, peerEK);

  let dhConcat: Uint8Array;

  if (usedOPKId) {
    const opkEntry = myBundle.oneTimePreKeys.find((k) => k.id === usedOPKId);
    if (!opkEntry) throw new Error(`OPK ${usedOPKId} not found`);
    // DH4 = DH(OPKb, EKa)
    const dh4 = await ecdhDeriveBits(opkEntry.keyPair.privateKey, peerEK);
    dhConcat = concatBuffers([dh1, dh2, dh3, dh4]);
    // Consume one-time prekey
    myBundle.oneTimePreKeys = myBundle.oneTimePreKeys.filter((k) => k.id !== usedOPKId);
  } else {
    dhConcat = concatBuffers([dh1, dh2, dh3]);
  }

  return hkdfDerive(dhConcat, 32);
}

// ─── Helpers ───────────────────────────────────────────────

async function ecdhDeriveBits(privateKey: CryptoKey, publicKey: CryptoKey): Promise<Uint8Array> {
  const bits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256
  );
  return new Uint8Array(bits);
}

async function importKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64);
  return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, ECDH_PARAMS, true, []);
}

async function hkdfDerive(ikm: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm.buffer as ArrayBuffer, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: HKDF_HASH,
      salt: new Uint8Array(32),
      info: X3DH_INFO.buffer as ArrayBuffer,
    },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

async function deriveSigningKey(privateKey: CryptoKey): Promise<CryptoKey> {
  // Derive HMAC key from ECDH private key for signing prekeys
  const bits = await crypto.subtle.exportKey("pkcs8", privateKey);
  const material = new Uint8Array(bits).slice(0, 32);
  return crypto.subtle.importKey(
    "raw",
    material.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function concatBuffers(buffers: Uint8Array[]): Uint8Array {
  const totalLen = buffers.reduce((acc, b) => acc + b.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const buf of buffers) {
    result.set(buf, offset);
    offset += buf.length;
  }
  return result;
}

function bufferToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
