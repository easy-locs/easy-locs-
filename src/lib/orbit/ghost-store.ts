/**
 * Ghost Store — Persistent ghost session management via localStorage.
 */
import {
  createGhostSession,
  closeGhostSession,
  isGhostSessionExpired,
  rotateGhostAlias,
  type GhostSession,
} from "./ghost-session";

const STORAGE_KEY = "orbit_ghost_session";

export function getGhostSession(): GhostSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GhostSession;
    if (isGhostSessionExpired(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function startGhostSession(ttlMinutes = 60) {
  const s = createGhostSession(ttlMinutes);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  return s;
}

export function refreshGhostAlias() {
  const current = getGhostSession();
  if (!current) return null;
  const next = rotateGhostAlias(current);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function endGhostSession() {
  const current = getGhostSession();
  if (!current) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(closeGhostSession(current)));
}
