import { encryptEnvelope, decryptEnvelope, type SecureEnvelopeV2 } from "@/lib/security-chief/envelope-crypto";
import { getOrCreateCurrentDomainKeyMeta } from "@/lib/security-chief/domain-keys";

const CACHE_PREFIX = "el_wallet_sec_";
const KEY_TTL_HOURS = 720;

async function ensureWalletKey() {
  await getOrCreateCurrentDomainKeyMeta("wallet", KEY_TTL_HOURS);
}

export async function secureWalletCache(key: string, data: unknown): Promise<void> {
  try {
    await ensureWalletKey();
    const envelope = await encryptEnvelope({
      domain: "wallet",
      plaintext: JSON.stringify(data),
      aad: `wallet_cache:${key}`,
    });
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(envelope));
  } catch {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  }
}

export async function readWalletCache<T = unknown>(key: string): Promise<T | null> {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as SecureEnvelopeV2;
    const plain = await decryptEnvelope(envelope);
    return JSON.parse(plain) as T;
  } catch {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    return null;
  }
}

export function clearWalletCache(key?: string): void {
  if (key) {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    return;
  }
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}

export function sanitizeWalletDisplay(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "•••";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "•••";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
