/**
 * Ghost Store — Re-exports from ghost-session for backward compatibility.
 */
export {
  createGhostSession as startGhostSession,
  getGhostSession,
  rotateGhostAlias as refreshGhostAlias,
  clearGhostSession as endGhostSession,
} from "./ghost-session";
