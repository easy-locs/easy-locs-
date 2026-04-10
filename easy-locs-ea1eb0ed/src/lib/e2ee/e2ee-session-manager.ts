/**
 * E2EE Session Manager — Per-conversation Double Ratchet session lifecycle.
 *
 * Responsibilities:
 * 1. Create / restore ratchet sessions per conversationId
 * 2. Persist ratchet state to localStorage (encrypted keys stay client-side only)
 * 3. Provide encrypt/decrypt wrappers that advance the ratchet automatically
 * 4. Auto-init a session via X3DH if none exists (self-bootstrap for MVP)
 *
 * The manager uses the Double Ratchet from orbit-double-ratchet.ts and
 * X3DH from x3dh-prekey.ts for initial key agreement.
 */
import {
  initRatchetAlice,
  ratchetEncrypt,
  ratchetDecrypt,
  generateRatchetKeyPair,
  exportRatchetPublicKey,
  type RatchetState,
  type RatchetMessage,
} from "@/lib/orbit-double-ratchet";
import {
  createLocalKeyBundle,
  initiateX3DH,
  exportPreKeyBundle,
  type LocalKeyBundle,
} from "@/lib/e2ee/x3dh-prekey";

const STORAGE_PREFIX = "el_ratchet_";
const STORAGE_WRAP_KEY = "el_e2ee_wrap";

interface SerializedSession {
  conversationId: string;
  rootKey: string;
  chainKeySend: string | null;
  chainKeyRecv: string | null;
  sendN: number;
  recvN: number;
  prevSendN: number;
  dhSendPublic: string;
  dhSendPrivate: string;
  dhRecvPublic: string | null;
  createdAt: string;
  messageCount: number;
}

const activeSessions = new Map<string, RatchetState>();
let localBundle: LocalKeyBundle | null = null;
let wrapKey: CryptoKey | null = null;

async function getWrapKey(): Promise<CryptoKey> {
  if (wrapKey) return wrapKey;
  const stored = localStorage.getItem(STORAGE_WRAP_KEY);
  if (stored) {
    const raw = base64ToArray(stored);
    wrapKey = await crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    return wrapKey;
  }
  wrapKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const exported = new Uint8Array(await crypto.subtle.exportKey("raw", wrapKey));
  localStorage.setItem(STORAGE_WRAP_KEY, arrayToBase64(exported));
  return wrapKey;
}

async function wrapEncrypt(plainJson: string): Promise<string> {
  const key = await getWrapKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plainJson)));
  return arrayToBase64(iv) + "." + arrayToBase64(ct);
}

async function wrapDecrypt(sealed: string): Promise<string> {
  const key = await getWrapKey();
  const [ivB64, ctB64] = sealed.split(".");
  const iv = base64ToArray(ivB64);
  const ct = base64ToArray(ctB64);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, key, ct.buffer as ArrayBuffer);
  return new TextDecoder().decode(plain);
}

async function ensureLocalBundle(): Promise<LocalKeyBundle> {
  if (localBundle) return localBundle;
  localBundle = await createLocalKeyBundle();
  return localBundle;
}

async function serializeRatchetState(convId: string, state: RatchetState): Promise<void> {
  try {
    const dhSendPubRaw = await crypto.subtle.exportKey("raw", state.dhSend.publicKey);
    const dhSendPrivRaw = await crypto.subtle.exportKey("pkcs8", state.dhSend.privateKey);
    const dhRecvPubRaw = state.dhRecv ? await crypto.subtle.exportKey("raw", state.dhRecv) : null;

    const serialized: SerializedSession = {
      conversationId: convId,
      rootKey: arrayToBase64(state.rootKey),
      chainKeySend: state.chainKeySend ? arrayToBase64(state.chainKeySend) : null,
      chainKeyRecv: state.chainKeyRecv ? arrayToBase64(state.chainKeyRecv) : null,
      sendN: state.sendN,
      recvN: state.recvN,
      prevSendN: state.prevSendN,
      dhSendPublic: arrayToBase64(new Uint8Array(dhSendPubRaw)),
      dhSendPrivate: arrayToBase64(new Uint8Array(dhSendPrivRaw)),
      dhRecvPublic: dhRecvPubRaw ? arrayToBase64(new Uint8Array(dhRecvPubRaw)) : null,
      createdAt: new Date().toISOString(),
      messageCount: state.sendN + state.recvN,
    };

    const sealed = await wrapEncrypt(JSON.stringify(serialized));
    localStorage.setItem(`${STORAGE_PREFIX}${convId}`, sealed);
  } catch {
    /* non-fatal — session continues in memory */
  }
}

async function deserializeRatchetState(convId: string): Promise<RatchetState | null> {
  try {
    const sealed = localStorage.getItem(`${STORAGE_PREFIX}${convId}`);
    if (!sealed) return null;

    const json = await wrapDecrypt(sealed);
    const s: SerializedSession = JSON.parse(json);
    const ECDH_P256 = { name: "ECDH", namedCurve: "P-256" };

    const dhSendPublic = await crypto.subtle.importKey(
      "raw", base64ToArray(s.dhSendPublic).buffer as ArrayBuffer,
      ECDH_P256, true, []
    );
    const dhSendPrivate = await crypto.subtle.importKey(
      "pkcs8", base64ToArray(s.dhSendPrivate).buffer as ArrayBuffer,
      ECDH_P256, true, ["deriveKey", "deriveBits"]
    );
    const dhRecv = s.dhRecvPublic
      ? await crypto.subtle.importKey("raw", base64ToArray(s.dhRecvPublic).buffer as ArrayBuffer, ECDH_P256, true, [])
      : null;

    return {
      dhSend: { publicKey: dhSendPublic, privateKey: dhSendPrivate },
      dhRecv,
      rootKey: base64ToArray(s.rootKey),
      chainKeySend: s.chainKeySend ? base64ToArray(s.chainKeySend) : null,
      chainKeyRecv: s.chainKeyRecv ? base64ToArray(s.chainKeyRecv) : null,
      sendN: s.sendN,
      recvN: s.recvN,
      prevSendN: s.prevSendN,
      skippedKeys: new Map(),
    };
  } catch {
    return null;
  }
}

async function getOrCreateSession(conversationId: string): Promise<RatchetState> {
  let state = activeSessions.get(conversationId);
  if (state) return state;

  state = await deserializeRatchetState(conversationId);
  if (state) {
    activeSessions.set(conversationId, state);
    return state;
  }

  const bundle = await ensureLocalBundle();
  const peerBundle = await exportPreKeyBundle(bundle);
  const x3dh = await initiateX3DH(bundle.identityKeyPair, peerBundle);

  const ratchetKeyPair = await generateRatchetKeyPair();
  state = await initRatchetAlice(x3dh.sharedSecret, ratchetKeyPair.publicKey);

  activeSessions.set(conversationId, state);
  await serializeRatchetState(conversationId, state);

  if (import.meta.env.DEV) {
    console.debug("[E2EE] Session bootstrapped for", conversationId);
  }
  return state;
}

export async function e2eeEncrypt(
  conversationId: string,
  plaintext: string,
): Promise<RatchetMessage> {
  const state = await getOrCreateSession(conversationId);
  const { message, newState } = await ratchetEncrypt(state, plaintext);

  activeSessions.set(conversationId, newState);
  void serializeRatchetState(conversationId, newState);

  return message;
}

export async function e2eeDecrypt(
  conversationId: string,
  message: RatchetMessage,
): Promise<string> {
  const state = await getOrCreateSession(conversationId);
  const { plaintext, newState } = await ratchetDecrypt(state, message);

  activeSessions.set(conversationId, newState);
  void serializeRatchetState(conversationId, newState);

  return plaintext;
}

export function hasActiveSession(conversationId: string): boolean {
  return activeSessions.has(conversationId) || localStorage.getItem(`${STORAGE_PREFIX}${conversationId}`) !== null;
}

export function destroySession(conversationId: string): void {
  activeSessions.delete(conversationId);
  localStorage.removeItem(`${STORAGE_PREFIX}${conversationId}`);
}

export async function warmupE2EE(): Promise<void> {
  try {
    await Promise.all([ensureLocalBundle(), getWrapKey()]);
  } catch { /* non-fatal */ }
}

export function getSessionStats(conversationId: string): { active: boolean; messageCount: number } {
  const state = activeSessions.get(conversationId);
  return {
    active: !!state,
    messageCount: state ? state.sendN + state.recvN : 0,
  };
}

function arrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToArray(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
