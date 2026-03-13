/**
 * useOrbitEncryption — React hook for E2E encrypted messaging
 * 
 * Handles key initialization, message encryption/decryption,
 * and public key exchange via the database.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  encryptMessage,
  decryptMessage,
  isCryptoAvailable,
  importPublicKey,
  deriveSharedKey,
  generateSafetyNumber,
  type EncryptedPayload,
} from "@/lib/orbit-crypto";
import {
  getOrCreateIdentityKeys,
  getPrivateKey,
  getPublicKeyBase64,
} from "@/lib/orbit-keystore";

interface UseOrbitEncryptionResult {
  /** Whether E2E is initialized and ready */
  ready: boolean;
  /** Whether crypto is supported in this browser */
  supported: boolean;
  /** Encrypt a plaintext message for a peer */
  encrypt: (plaintext: string, peerId: string) => Promise<string | null>;
  /** Decrypt an encrypted message from a peer */
  decrypt: (ciphertext: string, peerId: string) => Promise<string | null>;
  /** Get the safety number for a peer (for verification) */
  getSafetyNumber: (peerId: string) => Promise<string | null>;
  /** Whether the current user's keys are published */
  keysPublished: boolean;
}

/** Cache of derived shared keys (peerId → CryptoKey) */
const sharedKeyCache = new Map<string, CryptoKey>();

/** Cache of peer public key base64 strings */
const peerKeyCache = new Map<string, string>();

export function useOrbitEncryption(userId: string | undefined): UseOrbitEncryptionResult {
  const [ready, setReady] = useState(false);
  const [keysPublished, setKeysPublished] = useState(false);
  const supported = isCryptoAvailable();
  const initRef = useRef(false);

  // Initialize: create keys + publish public key
  useEffect(() => {
    if (!userId || !supported || initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        const { publicKeyBase64, isNew } = await getOrCreateIdentityKeys(userId);

        if (isNew) {
          // Publish public key to server
          await supabase.from("user_key_bundles" as any).upsert({
            user_id: userId,
            identity_public_key: publicKeyBase64,
            updated_at: new Date().toISOString(),
          } as any, { onConflict: "user_id" });
        }

        setKeysPublished(true);
        setReady(true);
      } catch (err) {
        console.error("[Orbit] Key initialization failed:", err);
        // Still mark as ready — encryption is optional, not blocking
        setReady(true);
      }
    })();
  }, [userId, supported]);

  /** Fetch a peer's public key from the server */
  const fetchPeerPublicKey = useCallback(async (peerId: string): Promise<string | null> => {
    const cached = peerKeyCache.get(peerId);
    if (cached) return cached;

    const { data } = await supabase
      .from("user_key_bundles" as any)
      .select("identity_public_key")
      .eq("user_id", peerId)
      .maybeSingle();

    const key = (data as any)?.identity_public_key as string | undefined;
    if (key) peerKeyCache.set(peerId, key);
    return key || null;
  }, []);

  /** Get or derive the shared key with a peer */
  const getSharedKey = useCallback(async (peerId: string): Promise<CryptoKey | null> => {
    if (!userId) return null;

    const cached = sharedKeyCache.get(peerId);
    if (cached) return cached;

    const privateKey = await getPrivateKey(userId);
    if (!privateKey) return null;

    const peerPubBase64 = await fetchPeerPublicKey(peerId);
    if (!peerPubBase64) return null;

    const peerPublicKey = await importPublicKey(peerPubBase64);
    const shared = await deriveSharedKey(privateKey, peerPublicKey);
    sharedKeyCache.set(peerId, shared);
    return shared;
  }, [userId, fetchPeerPublicKey]);

  const encrypt = useCallback(async (plaintext: string, peerId: string): Promise<string | null> => {
    try {
      const sharedKey = await getSharedKey(peerId);
      if (!sharedKey) return null; // Peer has no keys yet — send unencrypted

      const payload = await encryptMessage(plaintext, sharedKey);
      // Prefix with "e2e:" to identify encrypted messages
      return "e2e:" + JSON.stringify(payload);
    } catch {
      return null; // Encryption failed — caller should send plaintext
    }
  }, [getSharedKey]);

  const decrypt = useCallback(async (ciphertext: string, peerId: string): Promise<string | null> => {
    if (!ciphertext.startsWith("e2e:")) return ciphertext; // Not encrypted

    try {
      const sharedKey = await getSharedKey(peerId);
      if (!sharedKey) return null;

      const payload: EncryptedPayload = JSON.parse(ciphertext.slice(4));
      return await decryptMessage(payload, sharedKey);
    } catch {
      return "[Encrypted message — unable to decrypt]";
    }
  }, [getSharedKey]);

  const getSafetyNumber = useCallback(async (peerId: string): Promise<string | null> => {
    if (!userId) return null;

    try {
      const localPubBase64 = await getPublicKeyBase64(userId);
      const peerPubBase64 = await fetchPeerPublicKey(peerId);
      if (!localPubBase64 || !peerPubBase64) return null;

      const localKey = await importPublicKey(localPubBase64);
      const peerKey = await importPublicKey(peerPubBase64);
      return await generateSafetyNumber(localKey, peerKey);
    } catch {
      return null;
    }
  }, [userId, fetchPeerPublicKey]);

  return { ready, supported, encrypt, decrypt, getSafetyNumber, keysPublished };
}
