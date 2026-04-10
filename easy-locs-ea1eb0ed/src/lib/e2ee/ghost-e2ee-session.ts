/**
 * Ghost E2EE Session Orchestrator — Manages end-to-end encrypted sessions
 * for Ghost V2 (standard) and V3 (premium) tiers.
 *
 * V2: AES-256-GCM + ECDH P-256 + Double Ratchet + X3DH
 * V3: V2 + per-frame media E2EE (Insertable Streams) + post-quantum hints
 *
 * This orchestrator ties together:
 * - X3DH prekey exchange (initial shared secret)
 * - Double Ratchet (forward/future secrecy per message)
 * - Domain-isolated key management (chat/call/ghost/wallet)
 * - Ghost identity with alias rotation and TTL
 * - Security tier negotiation between peers
 */
import {
  createLocalKeyBundle,
  exportPreKeyBundle,
  initiateX3DH,
  respondX3DH,
  type LocalKeyBundle,
  type PreKeyBundle,
  type X3DHKeyAgreement,
} from "@/lib/e2ee/x3dh-prekey";
import {
  initRatchetAlice,
  initRatchetBob,
  ratchetEncrypt,
  ratchetDecrypt,
  importRatchetPublicKey,
  generateRatchetKeyPair,
  type RatchetState,
  type RatchetMessage,
} from "@/lib/orbit-double-ratchet";
import {
  createGhostIdentity,
  rotateGhostAlias,
  getGhostIdentity,
  type GhostIdentity,
} from "@/lib/security-chief/ghost-engine";
import { SECURITY_CHIEF_CONFIG } from "@/lib/security-chief/config";
import { debugLog } from "@/lib/debug/runtime-debug-bus";
import type { SecurityTier } from "@/lib/security-chief/types";

// ─── Types ─────────────────────────────────────────────────

export type GhostSessionState =
  | "uninitialized"
  | "awaiting_prekeys"
  | "x3dh_complete"
  | "ratchet_active"
  | "ratchet_stale"
  | "destroyed";

export interface GhostE2EESession {
  sessionId: string;
  peerId: string;
  tier: SecurityTier;
  state: GhostSessionState;
  ghostIdentity: GhostIdentity | null;
  ratchetState: RatchetState | null;
  localBundle: LocalKeyBundle | null;
  x3dhResult: X3DHKeyAgreement | null;
  createdAt: string;
  lastMessageAt: string | null;
  messageCount: number;
  /** V3 only: post-quantum hint for future hybrid negotiation */
  pqHybridReady: boolean;
}

export interface GhostSessionStats {
  sessionId: string;
  tier: SecurityTier;
  state: GhostSessionState;
  messageCount: number;
  ratchetActive: boolean;
  ghostAlias: string | null;
  ghostExpiry: string | null;
  pqReady: boolean;
  forwardSecrecy: boolean;
  futureSecrecy: boolean;
}

export interface EncryptedGhostMessage {
  sessionId: string;
  ratchetMessage: RatchetMessage;
  ghostAlias: string | null;
  tier: SecurityTier;
  pqHint: string | null;
}

// ─── V2/V3 Tier Negotiation ────────────────────────────────

export function negotiateSessionTier(myTier: SecurityTier, peerTier: SecurityTier): SecurityTier {
  // Use the lower tier between two peers for compatibility
  const tierOrder: SecurityTier[] = ["v1", "v2", "v3"];
  const myIdx = tierOrder.indexOf(myTier);
  const peerIdx = tierOrder.indexOf(peerTier);
  const negotiated = tierOrder[Math.min(myIdx, peerIdx)];
  debugLog.info("system", "e2ee_tier_negotiated", `${myTier} + ${peerTier} → ${negotiated}`);
  return negotiated;
}

export function getMyTier(): SecurityTier {
  return SECURITY_CHIEF_CONFIG.tier;
}

// ─── Session Store ─────────────────────────────────────────

const activeSessions = new Map<string, GhostE2EESession>();

export function getSession(sessionId: string): GhostE2EESession | null {
  return activeSessions.get(sessionId) ?? null;
}

export function getAllSessions(): GhostE2EESession[] {
  return Array.from(activeSessions.values());
}

// ─── Session Lifecycle ─────────────────────────────────────

/**
 * Create a new Ghost E2EE session as initiator (Alice).
 * Generates local X3DH bundle and waits for peer's prekey bundle.
 */
export async function createGhostSession(params: {
  peerId: string;
  enableGhostIdentity?: boolean;
  peerTier?: SecurityTier;
}): Promise<GhostE2EESession> {
  const sessionId = `gs_${crypto.randomUUID().slice(0, 12)}`;
  const myTier = getMyTier();
  const tier = params.peerTier ? negotiateSessionTier(myTier, params.peerTier) : myTier;

  debugLog.info("system", "ghost_session_create", `Creating session ${sessionId} tier=${tier}`);

  const localBundle = await createLocalKeyBundle();
  const ghostIdentity = params.enableGhostIdentity ? createGhostIdentity(6) : null;

  const session: GhostE2EESession = {
    sessionId,
    peerId: params.peerId,
    tier,
    state: "awaiting_prekeys",
    ghostIdentity,
    ratchetState: null,
    localBundle,
    x3dhResult: null,
    createdAt: new Date().toISOString(),
    lastMessageAt: null,
    messageCount: 0,
    pqHybridReady: tier === "v3" && SECURITY_CHIEF_CONFIG.enablePostQuantumReadyFields,
  };

  activeSessions.set(sessionId, session);
  debugLog.success("system", "ghost_session_created", sessionId, {
    tier,
    ghost: !!ghostIdentity,
    pqReady: session.pqHybridReady,
  });

  return session;
}

/**
 * Complete X3DH as initiator using peer's prekey bundle.
 * Transitions session to ratchet_active.
 */
export async function completeX3DHAsInitiator(
  sessionId: string,
  peerBundle: PreKeyBundle
): Promise<GhostE2EESession> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.localBundle) throw new Error(`Session ${sessionId} not found or missing bundle`);

  debugLog.info("system", "x3dh_initiate_start", `Session ${sessionId}`);

  // Perform X3DH key agreement
  const x3dhResult = await initiateX3DH(session.localBundle.identityKeyPair, peerBundle);

  // Initialize Double Ratchet as Alice
  const peerSPK = await importRatchetPublicKey(peerBundle.signedPreKey);
  const ratchetState = await initRatchetAlice(x3dhResult.sharedSecret, peerSPK);

  session.x3dhResult = x3dhResult;
  session.ratchetState = ratchetState;
  session.state = "ratchet_active";

  debugLog.success("system", "x3dh_complete", `Session ${sessionId} ratchet active`, {
    usedOPK: x3dhResult.usedOneTimePreKeyId ?? "none",
  });

  return session;
}

/**
 * Complete X3DH as responder using initiator's ephemeral key.
 */
export async function completeX3DHAsResponder(
  sessionId: string,
  peerIdentityKey: string,
  peerEphemeralKey: string,
  usedOPKId?: string
): Promise<GhostE2EESession> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.localBundle) throw new Error(`Session ${sessionId} not found`);

  debugLog.info("system", "x3dh_respond_start", `Session ${sessionId}`);

  const sharedSecret = await respondX3DH(
    session.localBundle,
    peerIdentityKey,
    peerEphemeralKey,
    usedOPKId
  );

  // Initialize Double Ratchet as Bob
  const ratchetState = await initRatchetBob(sharedSecret, session.localBundle.signedPreKeyPair);

  session.ratchetState = ratchetState;
  session.state = "ratchet_active";

  debugLog.success("system", "x3dh_respond_complete", `Session ${sessionId} ratchet active`);

  return session;
}

// ─── Message Encrypt/Decrypt ───────────────────────────────

/**
 * Encrypt a message using the Double Ratchet for a given session.
 */
export async function ghostEncrypt(
  sessionId: string,
  plaintext: string
): Promise<EncryptedGhostMessage> {
  const session = activeSessions.get(sessionId);
  if (!session || session.state !== "ratchet_active" || !session.ratchetState) {
    throw new Error(`Session ${sessionId} not ready for encryption`);
  }

  const { message, newState } = await ratchetEncrypt(session.ratchetState, plaintext);
  session.ratchetState = newState;
  session.messageCount++;
  session.lastMessageAt = new Date().toISOString();

  // Ghost alias rotation every 50 messages for V3
  if (session.ghostIdentity && session.tier === "v3" && session.messageCount % 50 === 0) {
    rotateGhostAlias(session.ghostIdentity.ghostId);
    debugLog.info("system", "ghost_alias_rotated", session.ghostIdentity.ghostId);
  }

  return {
    sessionId,
    ratchetMessage: message,
    ghostAlias: session.ghostIdentity?.alias ?? null,
    tier: session.tier,
    pqHint: session.pqHybridReady ? "mlkem768-ready" : null,
  };
}

/**
 * Decrypt a received Double Ratchet message.
 */
export async function ghostDecrypt(
  sessionId: string,
  encrypted: EncryptedGhostMessage
): Promise<string> {
  const session = activeSessions.get(sessionId);
  if (!session || !session.ratchetState) {
    throw new Error(`Session ${sessionId} not ready for decryption`);
  }

  const { plaintext, newState } = await ratchetDecrypt(session.ratchetState, encrypted.ratchetMessage);
  session.ratchetState = newState;

  return plaintext;
}

// ─── Session Status ────────────────────────────────────────

export function getSessionStats(sessionId: string): GhostSessionStats | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  const ghost = session.ghostIdentity ? getGhostIdentity(session.ghostIdentity.ghostId) : null;

  return {
    sessionId: session.sessionId,
    tier: session.tier,
    state: session.state,
    messageCount: session.messageCount,
    ratchetActive: session.state === "ratchet_active",
    ghostAlias: ghost?.alias ?? null,
    ghostExpiry: ghost?.expiresAt ?? null,
    pqReady: session.pqHybridReady,
    forwardSecrecy: session.state === "ratchet_active",
    futureSecrecy: session.state === "ratchet_active",
  };
}

// ─── Session Destruction ───────────────────────────────────

/**
 * Securely destroy a session — zero out keys and state.
 */
export function destroyGhostSession(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  debugLog.warn("system", "ghost_session_destroy", sessionId);

  // Zero out sensitive state
  session.ratchetState = null;
  session.localBundle = null;
  session.x3dhResult = null;
  session.state = "destroyed";

  activeSessions.delete(sessionId);
}

/**
 * Destroy all active sessions (e.g. on logout or panic).
 */
export function destroyAllGhostSessions() {
  const ids = Array.from(activeSessions.keys());
  ids.forEach(destroyGhostSession);
  debugLog.warn("system", "ghost_sessions_purged", `${ids.length} sessions destroyed`);
}

/**
 * Export local prekey bundle for sharing with peer.
 */
export async function exportSessionPreKeys(sessionId: string): Promise<PreKeyBundle | null> {
  const session = activeSessions.get(sessionId);
  if (!session?.localBundle) return null;
  return exportPreKeyBundle(session.localBundle);
}
