/**
 * Guest session — lightweight guest identity for unauthenticated users
 * (food delivery storefront, public ordering, etc.)
 */

const GUEST_ID_KEY = "easylocs_guest_id";

/** Get or create a persistent guest ID */
export function getGuestId(): string {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

/** Check if the current context is a guest (no authenticated user) */
export function isGuestUser(user: any): boolean {
  return !user;
}

/** Clear guest identity (e.g. after account creation) */
export function clearGuestId(): void {
  localStorage.removeItem(GUEST_ID_KEY);
}
