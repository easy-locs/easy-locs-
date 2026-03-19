/**
 * useGhostE2EE — Hook for managing Ghost E2EE sessions in React components.
 * Provides session creation, encryption/decryption, and status monitoring.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import {
  createGhostSession,
  completeX3DHAsInitiator,
  completeX3DHAsResponder,
  ghostEncrypt,
  ghostDecrypt,
  getSessionStats,
  destroyGhostSession,
  exportSessionPreKeys,
  getMyTier,
  type GhostE2EESession,
  type GhostSessionStats,
  type EncryptedGhostMessage,
} from "@/lib/e2ee/ghost-e2ee-session";
import type { PreKeyBundle } from "@/lib/e2ee/x3dh-prekey";
import type { SecurityTier } from "@/lib/security-chief/types";

interface UseGhostE2EEReturn {
  session: GhostE2EESession | null;
  stats: GhostSessionStats | null;
  tier: SecurityTier;
  isReady: boolean;
  isGhostActive: boolean;
  /** Create a new session as initiator */
  initSession: (peerId: string, ghost?: boolean, peerTier?: SecurityTier) => Promise<void>;
  /** Complete X3DH with peer's prekey bundle (initiator) */
  completeHandshake: (peerBundle: PreKeyBundle) => Promise<void>;
  /** Complete X3DH as responder */
  respondHandshake: (peerIK: string, peerEK: string, opkId?: string) => Promise<void>;
  /** Encrypt a message */
  encrypt: (plaintext: string) => Promise<EncryptedGhostMessage>;
  /** Decrypt a message */
  decrypt: (msg: EncryptedGhostMessage) => Promise<string>;
  /** Export local prekeys for peer */
  exportPreKeys: () => Promise<PreKeyBundle | null>;
  /** Destroy session */
  destroy: () => void;
}

export function useGhostE2EE(): UseGhostE2EEReturn {
  const [session, setSession] = useState<GhostE2EESession | null>(null);
  const [stats, setStats] = useState<GhostSessionStats | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const refreshStats = useCallback(() => {
    if (sessionIdRef.current) {
      setStats(getSessionStats(sessionIdRef.current));
    }
  }, []);

  // Auto-refresh stats periodically
  useEffect(() => {
    if (!sessionIdRef.current) return;
    const interval = setInterval(refreshStats, 5000);
    return () => clearInterval(interval);
  }, [session, refreshStats]);

  const initSession = useCallback(async (peerId: string, ghost = false, peerTier?: SecurityTier) => {
    const s = await createGhostSession({ peerId, enableGhostIdentity: ghost, peerTier });
    sessionIdRef.current = s.sessionId;
    setSession(s);
    refreshStats();
  }, [refreshStats]);

  const completeHandshake = useCallback(async (peerBundle: PreKeyBundle) => {
    if (!sessionIdRef.current) throw new Error("No session");
    const s = await completeX3DHAsInitiator(sessionIdRef.current, peerBundle);
    setSession({ ...s });
    refreshStats();
  }, [refreshStats]);

  const respondHandshake = useCallback(async (peerIK: string, peerEK: string, opkId?: string) => {
    if (!sessionIdRef.current) throw new Error("No session");
    const s = await completeX3DHAsResponder(sessionIdRef.current, peerIK, peerEK, opkId);
    setSession({ ...s });
    refreshStats();
  }, [refreshStats]);

  const encrypt = useCallback(async (plaintext: string) => {
    if (!sessionIdRef.current) throw new Error("No session");
    const result = await ghostEncrypt(sessionIdRef.current, plaintext);
    refreshStats();
    return result;
  }, [refreshStats]);

  const decrypt = useCallback(async (msg: EncryptedGhostMessage) => {
    if (!sessionIdRef.current) throw new Error("No session");
    return ghostDecrypt(sessionIdRef.current, msg);
  }, []);

  const exportPreKeys = useCallback(async () => {
    if (!sessionIdRef.current) return null;
    return exportSessionPreKeys(sessionIdRef.current);
  }, []);

  const destroy = useCallback(() => {
    if (sessionIdRef.current) {
      destroyGhostSession(sessionIdRef.current);
      sessionIdRef.current = null;
      setSession(null);
      setStats(null);
    }
  }, []);

  return {
    session,
    stats,
    tier: getMyTier(),
    isReady: session?.state === "ratchet_active",
    isGhostActive: !!session?.ghostIdentity,
    initSession,
    completeHandshake,
    respondHandshake,
    encrypt,
    decrypt,
    exportPreKeys,
    destroy,
  };
}
