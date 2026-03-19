/**
 * Ghost Session — Ephemeral anonymous identity with TTL.
 */

export interface GhostSession {
  id: string;
  alias: string;
  createdAt: string;
  expiresAt: string;
  active: boolean;
}

function randomId(len = 24) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export function createGhostSession(ttlMinutes = 60): GhostSession {
  const now = Date.now();
  return {
    id: `ghost_${randomId(20)}`,
    alias: `anon_${randomId(8)}`,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMinutes * 60_000).toISOString(),
    active: true,
  };
}

export function isGhostSessionExpired(session: GhostSession) {
  return new Date(session.expiresAt).getTime() <= Date.now();
}

export function rotateGhostAlias(session: GhostSession): GhostSession {
  return {
    ...session,
    alias: `anon_${randomId(8)}`,
  };
}

export function closeGhostSession(session: GhostSession): GhostSession {
  return {
    ...session,
    active: false,
    expiresAt: new Date().toISOString(),
  };
}
