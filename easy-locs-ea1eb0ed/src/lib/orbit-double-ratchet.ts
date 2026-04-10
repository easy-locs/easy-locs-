/**
 * Orbit Double Ratchet — Signal-grade forward & future secrecy
 * 
 * Implements the Double Ratchet Algorithm (Axolotl):
 * - Diffie-Hellman ratchet (P-256 ECDH) for future secrecy
 * - Symmetric-key ratchet (HKDF-SHA-512) for per-message keys
 * - Message key derivation with chain keys
 * - Out-of-order message handling via skipped key cache
 * 
 * Each message uses a unique encryption key. Compromising one key
 * does not compromise past or future messages.
 */

const ECDH_PARAMS: EcKeyGenParams = { name: "ECDH", namedCurve: "P-256" };
const AES_ALGO = "AES-GCM";
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;
const TAG_LENGTH = 128;
const HKDF_HASH = "SHA-512";
const MAX_SKIP = 256; // Max skipped message keys to store
const RATCHET_INFO = new TextEncoder().encode("orbit-ratchet-v3");
const MSG_KEY_INFO = new TextEncoder().encode("orbit-msg-key-v3");
const CHAIN_KEY_INFO = new TextEncoder().encode("orbit-chain-key-v3");

// ─── Types ─────────────────────────────────────────────────

export interface RatchetState {
  /** Our current DH ratchet key pair */
  dhSend: CryptoKeyPair;
  /** Peer's current DH ratchet public key */
  dhRecv: CryptoKey | null;
  /** Root key for KDF chain */
  rootKey: Uint8Array;
  /** Sending chain key */
  chainKeySend: Uint8Array | null;
  /** Receiving chain key */
  chainKeyRecv: Uint8Array | null;
  /** Send message counter */
  sendN: number;
  /** Receive message counter */
  recvN: number;
  /** Previous sending chain length (for header) */
  prevSendN: number;
  /** Skipped message keys: Map<`${dhPub}:${n}`, messageKey> */
  skippedKeys: Map<string, Uint8Array>;
}

export interface RatchetHeader {
  /** Sender's current DH ratchet public key (base64) */
  dh: string;
  /** Previous chain message count */
  pn: number;
  /** Message number in current chain */
  n: number;
}

export interface RatchetMessage {
  /** Header (unencrypted, needed for ratchet) */
  h: RatchetHeader;
  /** Ciphertext (base64) */
  ct: string;
  /** IV (base64) */
  iv: string;
  /** Protocol version */
  v: 3;
  /** Timestamp */
  ts: number;
}

// ─── Key Generation ────────────────────────────────────────

export async function generateRatchetKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey", "deriveBits"]);
}

export async function exportRatchetPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bufferToBase64(new Uint8Array(raw));
}

export async function importRatchetPublicKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64);
  return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, ECDH_PARAMS, true, []);
}

// ─── ECDH + KDF Root Chain ─────────────────────────────────

async function dh(keyPair: CryptoKeyPair, peerPublic: CryptoKey): Promise<Uint8Array> {
  const bits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: peerPublic },
    keyPair.privateKey,
    256
  );
  return new Uint8Array(bits as ArrayBuffer);
}

async function kdfRootKey(
  rootKey: Uint8Array,
  dhOutput: Uint8Array
): Promise<{ newRootKey: Uint8Array; chainKey: Uint8Array }> {
  const ikm = new Uint8Array(rootKey.length + dhOutput.length);
  ikm.set(rootKey, 0);
  ikm.set(dhOutput, rootKey.length);

  const hkdfKey = await crypto.subtle.importKey("raw", ikm.buffer as ArrayBuffer, "HKDF", false, ["deriveBits"]);
  const derived = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: HKDF_HASH, salt: new ArrayBuffer(64), info: RATCHET_INFO.buffer as ArrayBuffer },
      hkdfKey,
      512
    ) as ArrayBuffer
  );

  return {
    newRootKey: derived.slice(0, 32),
    chainKey: derived.slice(32, 64),
  };
}

// ─── Symmetric Chain Ratchet ───────────────────────────────

async function kdfChainKey(
  chainKey: Uint8Array
): Promise<{ newChainKey: Uint8Array; messageKey: Uint8Array }> {
  // Chain key → next chain key
  const ckMaterial = await crypto.subtle.importKey("raw", chainKey.buffer as ArrayBuffer, "HKDF", false, ["deriveBits"]);
  const ckDerived = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: HKDF_HASH, salt: new ArrayBuffer(64), info: CHAIN_KEY_INFO.buffer as ArrayBuffer },
      ckMaterial,
      256
    ) as ArrayBuffer
  );

  // Chain key → message key
  const mkMaterial = await crypto.subtle.importKey("raw", chainKey.buffer as ArrayBuffer, "HKDF", false, ["deriveBits"]);
  const mkDerived = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: HKDF_HASH, salt: new ArrayBuffer(64), info: MSG_KEY_INFO.buffer as ArrayBuffer },
      mkMaterial,
      256
    ) as ArrayBuffer
  );

  return { newChainKey: ckDerived, messageKey: mkDerived };
}

// ─── Initialize Ratchet ────────────────────────────────────

/**
 * Initialize ratchet as the initiator (Alice).
 * Call after X3DH key agreement produces a shared secret.
 * Alice generates a P-256 ratchet keypair and derives her sending chain
 * from the shared secret via HKDF. The DH ratchet advances on first
 * message exchange when Bob's ratchet public key arrives in a header.
 */
export async function initRatchetAlice(
  sharedSecret: Uint8Array
): Promise<RatchetState> {
  const dhSend = await generateRatchetKeyPair();
  const { newRootKey, chainKey } = await kdfRootKey(
    sharedSecret.slice(0, 32),
    sharedSecret.slice(32, 64).length >= 32
      ? sharedSecret.slice(32, 64)
      : sharedSecret.slice(0, 32)
  );

  return {
    dhSend,
    dhRecv: null,
    rootKey: newRootKey,
    chainKeySend: chainKey,
    chainKeyRecv: null,
    sendN: 0,
    recvN: 0,
    prevSendN: 0,
    skippedKeys: new Map(),
  };
}

/**
 * Initialize ratchet as the responder (Bob).
 * Uses Bob's signed prekey as initial DH key.
 */
export async function initRatchetBob(
  sharedSecret: Uint8Array,
  signedPreKey: CryptoKeyPair
): Promise<RatchetState> {
  return {
    dhSend: signedPreKey,
    dhRecv: null,
    rootKey: sharedSecret,
    chainKeySend: null,
    chainKeyRecv: null,
    sendN: 0,
    recvN: 0,
    prevSendN: 0,
    skippedKeys: new Map(),
  };
}

// ─── Encrypt (Send) ───────────────────────────────────────

export async function ratchetEncrypt(
  state: RatchetState,
  plaintext: string
): Promise<{ message: RatchetMessage; newState: RatchetState }> {
  if (!state.chainKeySend) {
    throw new Error("Send chain not initialized");
  }

  const { newChainKey, messageKey } = await kdfChainKey(state.chainKeySend);
  const dhPub = await exportRatchetPublicKey(state.dhSend.publicKey);

  const header: RatchetHeader = {
    dh: dhPub,
    pn: state.prevSendN,
    n: state.sendN,
  };

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const timestamp = Date.now();
  const aad = new TextEncoder().encode(`orbit-v3-${timestamp}-${header.n}`);

  const aesKey = await crypto.subtle.importKey(
    "raw", messageKey.buffer as ArrayBuffer, { name: AES_ALGO, length: AES_KEY_LENGTH }, false, ["encrypt"]
  );

  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_ALGO, iv, tagLength: TAG_LENGTH, additionalData: aad },
    aesKey,
    encoded
  );

  const message: RatchetMessage = {
    h: header,
    ct: bufferToBase64(new Uint8Array(ciphertext)),
    iv: bufferToBase64(iv),
    v: 3,
    ts: timestamp,
  };

  return {
    message,
    newState: {
      ...state,
      chainKeySend: newChainKey,
      sendN: state.sendN + 1,
    },
  };
}

// ─── Decrypt (Receive) ─────────────────────────────────────

export async function ratchetDecrypt(
  state: RatchetState,
  message: RatchetMessage
): Promise<{ plaintext: string; newState: RatchetState }> {
  const header = message.h;

  // Try skipped message keys first
  const skippedKeyId = `${header.dh}:${header.n}`;
  const skippedKey = state.skippedKeys.get(skippedKeyId);
  if (skippedKey) {
    const newSkipped = new Map(state.skippedKeys);
    newSkipped.delete(skippedKeyId);
    const plaintext = await decryptWithKey(skippedKey, message);
    return { plaintext, newState: { ...state, skippedKeys: newSkipped } };
  }

  const peerPub = await importRatchetPublicKey(header.dh);
  let newState = { ...state, skippedKeys: new Map(state.skippedKeys) };

  // Check if we need a DH ratchet step
  const currentPeerPub = state.dhRecv ? await exportRatchetPublicKey(state.dhRecv) : null;
  if (header.dh !== currentPeerPub) {
    // Skip any remaining messages on old receiving chain
    if (state.chainKeyRecv) {
      newState = await skipMessageKeys(newState, header.pn);
    }

    // DH ratchet step
    const dhOutput = await dh(state.dhSend, peerPub);
    const { newRootKey, chainKey } = await kdfRootKey(state.rootKey, dhOutput);

    newState.dhRecv = peerPub;
    newState.rootKey = newRootKey;
    newState.chainKeyRecv = chainKey;
    newState.recvN = 0;

    // Generate new DH send key pair
    const newDhSend = await generateRatchetKeyPair();
    const dhOutput2 = await dh(newDhSend, peerPub);
    const { newRootKey: rk2, chainKey: ck2 } = await kdfRootKey(newRootKey, dhOutput2);

    newState.dhSend = newDhSend;
    newState.rootKey = rk2;
    newState.chainKeySend = ck2;
    newState.prevSendN = newState.sendN;
    newState.sendN = 0;
  }

  // Skip messages if needed
  newState = await skipMessageKeys(newState, header.n);

  // Derive message key
  if (!newState.chainKeyRecv) throw new Error("No receive chain key");
  const { newChainKey, messageKey } = await kdfChainKey(newState.chainKeyRecv);
  newState.chainKeyRecv = newChainKey;
  newState.recvN = header.n + 1;

  const plaintext = await decryptWithKey(messageKey, message);
  return { plaintext, newState };
}

async function skipMessageKeys(state: RatchetState, until: number): Promise<RatchetState> {
  if (!state.chainKeyRecv) return state;
  if (until - state.recvN > MAX_SKIP) {
    throw new Error("Too many skipped messages");
  }

  let chainKey = state.chainKeyRecv;
  const skipped = new Map(state.skippedKeys);
  const dhPub = state.dhRecv ? await exportRatchetPublicKey(state.dhRecv) : "unknown";
  let n = state.recvN;

  while (n < until) {
    const { newChainKey, messageKey } = await kdfChainKey(chainKey);
    skipped.set(`${dhPub}:${n}`, messageKey);
    chainKey = newChainKey;
    n++;
  }

  // Prune oldest skipped keys if over limit
  while (skipped.size > MAX_SKIP * 2) {
    const firstKey = skipped.keys().next().value;
    if (firstKey) skipped.delete(firstKey);
  }

  return { ...state, chainKeyRecv: chainKey, recvN: n, skippedKeys: skipped };
}

async function decryptWithKey(messageKey: Uint8Array, message: RatchetMessage): Promise<string> {
  const iv = base64ToBuffer(message.iv);
  const ct = base64ToBuffer(message.ct);
  const aad = new TextEncoder().encode(`orbit-v3-${message.ts}-${message.h.n}`);

  const aesKey = await crypto.subtle.importKey(
    "raw", messageKey.buffer as ArrayBuffer, { name: AES_ALGO, length: AES_KEY_LENGTH }, false, ["decrypt"]
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: AES_ALGO, iv: iv.buffer as ArrayBuffer, tagLength: TAG_LENGTH, additionalData: aad.buffer as ArrayBuffer },
    aesKey,
    ct.buffer as ArrayBuffer
  );

  return new TextDecoder().decode(plaintext);
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

export { bufferToBase64, base64ToBuffer };

export interface SerializedRatchetState {
  dhSendPrivateJwk: JsonWebKey;
  dhSendPublicBase64: string;
  dhRecvBase64: string | null;
  rootKey: string;
  chainKeySend: string | null;
  chainKeyRecv: string | null;
  sendN: number;
  recvN: number;
  prevSendN: number;
  skippedKeys: Array<[string, string]>;
}

export async function serializeRatchetState(state: RatchetState): Promise<SerializedRatchetState> {
  const dhSendPrivateJwk = await crypto.subtle.exportKey("jwk", state.dhSend.privateKey);
  const dhSendPublicBase64 = await exportRatchetPublicKey(state.dhSend.publicKey);
  const dhRecvBase64 = state.dhRecv ? await exportRatchetPublicKey(state.dhRecv) : null;
  const skippedEntries: Array<[string, string]> = [];
  for (const [k, v] of state.skippedKeys) {
    skippedEntries.push([k, bufferToBase64(v)]);
  }
  return {
    dhSendPrivateJwk,
    dhSendPublicBase64,
    dhRecvBase64,
    rootKey: bufferToBase64(state.rootKey),
    chainKeySend: state.chainKeySend ? bufferToBase64(state.chainKeySend) : null,
    chainKeyRecv: state.chainKeyRecv ? bufferToBase64(state.chainKeyRecv) : null,
    sendN: state.sendN,
    recvN: state.recvN,
    prevSendN: state.prevSendN,
    skippedKeys: skippedEntries,
  };
}

export async function deserializeRatchetState(data: SerializedRatchetState): Promise<RatchetState> {
  const privateKey = await crypto.subtle.importKey("jwk", data.dhSendPrivateJwk, ECDH_PARAMS, true, ["deriveKey", "deriveBits"]);
  const publicKey = await importRatchetPublicKey(data.dhSendPublicBase64);
  const dhRecv = data.dhRecvBase64 ? await importRatchetPublicKey(data.dhRecvBase64) : null;
  const skippedKeys = new Map<string, Uint8Array>();
  for (const [k, v] of data.skippedKeys) {
    skippedKeys.set(k, base64ToBuffer(v));
  }
  return {
    dhSend: { privateKey, publicKey },
    dhRecv,
    rootKey: base64ToBuffer(data.rootKey),
    chainKeySend: data.chainKeySend ? base64ToBuffer(data.chainKeySend) : null,
    chainKeyRecv: data.chainKeyRecv ? base64ToBuffer(data.chainKeyRecv) : null,
    sendN: data.sendN,
    recvN: data.recvN,
    prevSendN: data.prevSendN,
    skippedKeys,
  };
}
