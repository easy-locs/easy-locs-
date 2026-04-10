import type { BackendSecurityContract, SecurityDomain } from "./types";
import { nowIso } from "./utils";

const localReplayCache = new Map<string, string>();

function replayKey(domain: SecurityDomain, nonce: string) {
  return `${domain}:${nonce}`;
}

export async function assertNotReplayed(params: {
  backend: BackendSecurityContract;
  domain: SecurityDomain;
  nonce: string;
}): Promise<void> {
  const key = replayKey(params.domain, params.nonce);
  if (localReplayCache.has(key)) {
    throw new Error("Replay detected (local cache)");
  }

  const accepted = await params.backend.consumeNonce(params.nonce, params.domain);
  if (!accepted) {
    throw new Error("Replay detected (backend)");
  }

  localReplayCache.set(key, nowIso());
}

export function clearOldReplayCache(maxEntries = 5000) {
  if (localReplayCache.size <= maxEntries) return;
  const firstKeys = Array.from(localReplayCache.keys()).slice(0, localReplayCache.size - maxEntries);
  for (const k of firstKeys) localReplayCache.delete(k);
}
