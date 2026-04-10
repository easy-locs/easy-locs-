/**
 * Orbit X3DH — Extended Triple Diffie-Hellman Key Agreement
 * 
 * Signal-grade PreKey bundle system enabling encrypted messaging
 * to offline users. Implements the X3DH protocol:
 * 
 * PreKey Bundle:
 * - Identity Key (IK): long-term P-521 key pair
 * - Signed PreKey (SPK): medium-term P-521, signed by IK
 * - One-Time PreKeys (OPK): single-use P-521 keys
 * 
 * Key Agreement (Alice → Bob):
 * DH1 = DH(IK_A, SPK_B)
 * DH2 = DH(EK_A, IK_B)  
 * DH3 = DH(EK_A, SPK_B)
 * DH4 = DH(EK_A, OPK_B) [if available]
 * SK = KDF(DH1 || DH2 || DH3 || DH4)
 */

const ECDH_PARAMS: EcKeyGenParams = { name: "ECDH", namedCurve: "P-521" };
const HKDF_HASH = "SHA-512";
const X3DH_INFO = new TextEncoder().encode("orbit-x3dh-v3-key-agreement");
const PREKEY_COUNT = 10; // Number of one-time prekeys to generate

// ─── Types ─────────────────────────────────────────────────

export interface PreKeyBundle {
  /** Identity public key (base64) */
  identityKey: string;
  /** Signed prekey public key (base64) */
  signedPreKey: string;
  /** Signed prekey signature (base64) - IK signs SPK */
  signedPreKeySignature: string;
  /** Signed prekey ID */
  signedPreKeyId: number;
  /** One-time prekey public keys (base64[]) */
  oneTimePreKeys: Array<{ id: number; key: string }>;
}

export interface X3DHInitResult {
  /** Shared secret for Double Ratchet initialization */
  sharedSecret: Uint8Array;
  /** Ephemeral key used (base64) - sent to peer */
  ephemeralKey: string;
  /** Which one-time prekey was used (or -1) */
  usedOneTimePreKeyId: number;
  /** Peer's signed prekey for ratchet init */
  peerSignedPreKey: CryptoKey;
}

export interface X3DHResponseResult {
  /** Shared secret matching initiator's */
  sharedSecret: Uint8Array;
}

// ─── Key Generation ────────────────────────────────────────

async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey", "deriveBits"]);
}

async function exportPubKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bufferToBase64(new Uint8Array(raw));
}

async function importPubKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64);
  return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, ECDH_PARAMS, true, []);
}

// ─── Signing (ECDSA with P-521) ────────────────────────────

const ECDSA_PARAMS: EcKeyGenParams = { name: "ECDSA", namedCurve: "P-521" };

export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDSA_PARAMS, true, ["sign", "verify"]);
}

async function signData(privateKey: CryptoKey, data: ArrayBuffer): Promise<string> {
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-512" },
    privateKey,
    data
  );
  return bufferToBase64(new Uint8Array(sig as ArrayBuffer));
}

async function verifySignature(publicKey: CryptoKey, signature: string, data: ArrayBuffer): Promise<boolean> {
  const sigBytes = base64ToBuffer(signature);
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-512" },
    publicKey,
    sigBytes.buffer as ArrayBuffer,
    data
  );
}

// ─── PreKey Bundle Generation ──────────────────────────────

export interface GeneratedPreKeyBundle {
  bundle: PreKeyBundle;
  /** Private keys to store locally */
  privateKeys: {
    signedPreKey: CryptoKeyPair;
    signedPreKeyId: number;
    oneTimePreKeys: Array<{ id: number; keyPair: CryptoKeyPair }>;
  };
}

export async function generatePreKeyBundle(
  identityKeyPair: CryptoKeyPair,
  signingKeyPair: CryptoKeyPair,
  startPreKeyId: number = 0
): Promise<GeneratedPreKeyBundle> {
  // Generate signed prekey
  const signedPreKey = await generateKeyPair();
  const spkPublicRaw = await crypto.subtle.exportKey("raw", signedPreKey.publicKey);
  const spkSignature = await signData(signingKeyPair.privateKey, spkPublicRaw);
  const signedPreKeyId = Date.now();

  // Generate one-time prekeys
  const oneTimePreKeys: Array<{ id: number; keyPair: CryptoKeyPair }> = [];
  const otpkPublic: Array<{ id: number; key: string }> = [];

  for (let i = 0; i < PREKEY_COUNT; i++) {
    const kp = await generateKeyPair();
    const id = startPreKeyId + i;
    oneTimePreKeys.push({ id, keyPair: kp });
    otpkPublic.push({ id, key: await exportPubKey(kp.publicKey) });
  }

  const identityPub = await exportPubKey(identityKeyPair.publicKey);
  const signedPreKeyPub = await exportPubKey(signedPreKey.publicKey);

  return {
    bundle: {
      identityKey: identityPub,
      signedPreKey: signedPreKeyPub,
      signedPreKeySignature: spkSignature,
      signedPreKeyId,
      oneTimePreKeys: otpkPublic,
    },
    privateKeys: {
      signedPreKey,
      signedPreKeyId,
      oneTimePreKeys,
    },
  };
}

// ─── X3DH Initiator (Alice) ───────────────────────────────

export async function x3dhInitiate(
  identityKeyPair: CryptoKeyPair,
  peerBundle: PreKeyBundle
): Promise<X3DHInitResult> {
  const peerIK = await importPubKey(peerBundle.identityKey);
  const peerSPK = await importPubKey(peerBundle.signedPreKey);

  // Generate ephemeral key
  const ephemeralKey = await generateKeyPair();

  // DH1 = DH(IK_A, SPK_B)
  const dh1 = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: peerSPK }, identityKeyPair.privateKey, 528)
  );

  // DH2 = DH(EK_A, IK_B)
  const dh2 = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: peerIK }, ephemeralKey.privateKey, 528)
  );

  // DH3 = DH(EK_A, SPK_B)
  const dh3 = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: peerSPK }, ephemeralKey.privateKey, 528)
  );

  let usedOTPKId = -1;
  let dhConcat = new Uint8Array(dh1.length + dh2.length + dh3.length);
  dhConcat.set(dh1, 0);
  dhConcat.set(dh2, dh1.length);
  dhConcat.set(dh3, dh1.length + dh2.length);

  // DH4 = DH(EK_A, OPK_B) if available
  if (peerBundle.oneTimePreKeys.length > 0) {
    const otpk = peerBundle.oneTimePreKeys[0];
    const peerOPK = await importPubKey(otpk.key);
    const dh4 = new Uint8Array(
      await crypto.subtle.deriveBits({ name: "ECDH", public: peerOPK }, ephemeralKey.privateKey, 528)
    );
    usedOTPKId = otpk.id;

    const newConcat = new Uint8Array(dhConcat.length + dh4.length);
    newConcat.set(dhConcat, 0);
    newConcat.set(dh4, dhConcat.length);
    dhConcat = newConcat;
  }

  // KDF to derive shared secret
  const sharedSecret = await kdfX3DH(dhConcat);

  return {
    sharedSecret,
    ephemeralKey: await exportPubKey(ephemeralKey.publicKey),
    usedOneTimePreKeyId: usedOTPKId,
    peerSignedPreKey: peerSPK,
  };
}

// ─── X3DH Responder (Bob) ─────────────────────────────────

export async function x3dhRespond(
  identityKeyPair: CryptoKeyPair,
  signedPreKey: CryptoKeyPair,
  oneTimePreKey: CryptoKeyPair | null,
  peerIdentityKey: string,
  peerEphemeralKey: string
): Promise<X3DHResponseResult> {
  const peerIK = await importPubKey(peerIdentityKey);
  const peerEK = await importPubKey(peerEphemeralKey);

  // DH1 = DH(SPK_B, IK_A)
  const dh1 = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: peerIK }, signedPreKey.privateKey, 528)
  );

  // DH2 = DH(IK_B, EK_A)
  const dh2 = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: peerEK }, identityKeyPair.privateKey, 528)
  );

  // DH3 = DH(SPK_B, EK_A)
  const dh3 = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: peerEK }, signedPreKey.privateKey, 528)
  );

  let dhConcat = new Uint8Array(dh1.length + dh2.length + dh3.length);
  dhConcat.set(dh1, 0);
  dhConcat.set(dh2, dh1.length);
  dhConcat.set(dh3, dh1.length + dh2.length);

  // DH4 if OPK was used
  if (oneTimePreKey) {
    const dh4 = new Uint8Array(
      await crypto.subtle.deriveBits({ name: "ECDH", public: peerEK }, oneTimePreKey.privateKey, 528)
    );
    const newConcat = new Uint8Array(dhConcat.length + dh4.length);
    newConcat.set(dhConcat, 0);
    newConcat.set(dh4, dhConcat.length);
    dhConcat = newConcat;
  }

  const sharedSecret = await kdfX3DH(dhConcat);
  return { sharedSecret };
}

// ─── KDF ───────────────────────────────────────────────────

async function kdfX3DH(input: Uint8Array): Promise<Uint8Array> {
  // Prepend 32 bytes of 0xFF as per Signal spec
  const padded = new Uint8Array(32 + input.length);
  padded.fill(0xFF, 0, 32);
  padded.set(input, 32);

  const hkdfKey = await crypto.subtle.importKey("raw", padded, "HKDF", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: HKDF_HASH, salt: new Uint8Array(64), info: X3DH_INFO },
    hkdfKey,
    256
  );

  return new Uint8Array(derived);
}

// ─── Utilities ─────────────────────────────────────────────

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
