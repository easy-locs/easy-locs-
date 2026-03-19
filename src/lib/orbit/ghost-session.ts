/**
 * Ghost Session — Ephemeral anonymous identity with TTL.
 */

export interface GhostSession {
  sessionId: string;
  alias: string;
  createdAt: string;
  expiresAt: string;
}

const GHOST_SESSION_KEY = "el_ghost_session_v1";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function rand(size = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let out = "";
  for (let i = 0; i < size; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export function createGhostSession(ttlMs = DEFAULT_TTL_MS): GhostSession {
  const now = Date.now();
  const session: GhostSession = {
    sessionId: `ghost_${rand(18)}`,
    alias: `ghost-${rand(6)}`,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
  };

  localStorage.setItem(GHOST_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getGhostSession(): GhostSession | null {
  const raw = localStorage.getItem(GHOST_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as GhostSession;
    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(GHOST_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function rotateGhostAlias(): GhostSession | null {
  const current = getGhostSession();
  if (!current) return null;

  const updated: GhostSession = {
    ...current,
    alias: `ghost-${rand(6)}`,
  };

  localStorage.setItem(GHOST_SESSION_KEY, JSON.stringify(updated));
  return updated;
}

export function clearGhostSession() {
  localStorage.removeItem(GHOST_SESSION_KEY);
}
