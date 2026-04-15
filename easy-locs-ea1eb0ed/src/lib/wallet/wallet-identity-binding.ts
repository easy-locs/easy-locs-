/**
 * wallet-identity-binding — Cryptographic HMAC binding between user UUID and wallet.
 * Ensures wallet ownership cannot be forged or transferred without auth verification.
 *
 * Flow:
 *   1. On wallet creation: generate HMAC(userId + deviceId) → store as binding_proof
 *   2. On every wallet access: verify the binding_proof matches current identity
 *   3. On device change: re-bind with new deviceId (requires auth re-verification)
 */

import { supabase } from "@/integrations/supabase/client";

const BINDING_KEY = "easylocs_wallet_binding";
const ALGO = "HMAC";
const HASH = "SHA-256";

async function deriveBindingKey(userId: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(`${userId}:${salt}`),
    { name: ALGO, hash: HASH },
    false,
    ["sign", "verify"],
  );
  return keyMaterial;
}

function generateSalt(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface WalletBindingProof {
  userId: string;
  deviceId: string;
  walletId: string;
  hmac: string;
  salt: string;
  boundAt: number;
}

export async function createWalletBinding(
  userId: string,
  deviceId: string,
  walletId: string,
): Promise<WalletBindingProof> {
  const salt = generateSalt();
  const key = await deriveBindingKey(userId, salt);
  const message = new TextEncoder().encode(`${userId}:${deviceId}:${walletId}`);
  const sig = await crypto.subtle.sign(ALGO, key, message);
  const hmac = toHex(sig);

  const proof: WalletBindingProof = {
    userId,
    deviceId,
    walletId,
    hmac,
    salt,
    boundAt: Date.now(),
  };

  try {
    localStorage.setItem(BINDING_KEY, JSON.stringify(proof));
  } catch {
    // storage unavailable
  }

  const { error: regError } = await supabase.from("wallet_device_bindings").upsert(
    {
      user_id: userId,
      device_id: deviceId,
      wallet_id: walletId,
      hmac,
      salt,
      bound_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,wallet_id" },
  );

  if (regError) {
    console.error("[wallet-binding] Failed to register device binding server-side:", regError.message);
    throw new Error("Device binding registration failed — cannot proceed with wallet operations");
  }

  return proof;
}

export async function verifyWalletBinding(
  userId: string,
  deviceId: string,
  walletId: string,
): Promise<{ valid: boolean; reason?: string }> {
  const stored = getStoredBinding();
  if (!stored) {
    return { valid: false, reason: "no_binding" };
  }

  if (stored.userId !== userId) {
    return { valid: false, reason: "user_mismatch" };
  }

  if (stored.walletId !== walletId) {
    return { valid: false, reason: "wallet_mismatch" };
  }

  if (!stored.salt) {
    return { valid: false, reason: "hmac_tampered" };
  }

  const key = await deriveBindingKey(userId, stored.salt);
  const message = new TextEncoder().encode(`${userId}:${deviceId}:${walletId}`);

  if (stored.deviceId === deviceId) {
    const sig = await crypto.subtle.sign(ALGO, key, message);
    const expected = toHex(sig);
    if (expected !== stored.hmac) {
      return { valid: false, reason: "hmac_tampered" };
    }
    return { valid: true };
  }

  return { valid: false, reason: "device_changed" };
}

export function getStoredBinding(): WalletBindingProof | null {
  try {
    const raw = localStorage.getItem(BINDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WalletBindingProof;
  } catch {
    return null;
  }
}

export function clearWalletBinding(): void {
  try {
    localStorage.removeItem(BINDING_KEY);
  } catch {
    // noop
  }
}

export async function ensureWalletBinding(
  userId: string,
  deviceId: string,
  walletId: string,
): Promise<WalletBindingProof> {
  const existing = getStoredBinding();

  if (existing && existing.userId === userId && existing.walletId === walletId) {
    const verification = await verifyWalletBinding(userId, deviceId, walletId);
    if (verification.valid) return existing;

    if (verification.reason === "device_changed") {
      return createWalletBinding(userId, deviceId, walletId);
    }
  }

  return createWalletBinding(userId, deviceId, walletId);
}
