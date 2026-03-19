import { randomHex } from "./utils";
import { encryptEnvelope, decryptEnvelope } from "./envelope-crypto";
import { assertDomainIsolation } from "./domain-isolation";

export interface GhostIdentity {
  ghostId: string;
  alias: string;
  createdAt: string;
  expiresAt: string;
}

const ghostMemory = new Map<string, GhostIdentity>();

export function createGhostIdentity(ttlHours = 6): GhostIdentity {
  assertDomainIsolation("ghost", "ghost");

  const now = Date.now();
  const identity: GhostIdentity = {
    ghostId: `ghost_${randomHex(8)}`,
    alias: `anon_${randomHex(4)}`,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlHours * 3600_000).toISOString(),
  };

  ghostMemory.set(identity.ghostId, identity);
  return identity;
}

export function getGhostIdentity(ghostId: string): GhostIdentity | null {
  const item = ghostMemory.get(ghostId) ?? null;
  if (!item) return null;
  if (new Date(item.expiresAt).getTime() < Date.now()) {
    ghostMemory.delete(ghostId);
    return null;
  }
  return item;
}

export function rotateGhostAlias(ghostId: string): GhostIdentity | null {
  const item = getGhostIdentity(ghostId);
  if (!item) return null;
  item.alias = `anon_${randomHex(4)}`;
  ghostMemory.set(ghostId, item);
  return item;
}

export async function encryptGhostPayload(ghostId: string, text: string) {
  return encryptEnvelope({
    domain: "ghost",
    plaintext: text,
    aad: `ghost:${ghostId}`,
  });
}

export async function decryptGhostPayload(envelope: Awaited<ReturnType<typeof encryptGhostPayload>>) {
  return decryptEnvelope(envelope);
}
