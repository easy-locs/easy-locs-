/**
 * Identity Propagation — Canonical avatar/name update pipeline.
 * When a user updates their profile photo or name, this pipeline
 * invalidates caches and emits events to refresh ALL surfaces.
 *
 * Surfaces: thread list, thread header, messages, calls, notifications, contacts.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { invalidateIdentityCache as invalidateCache } from "@/lib/cache/identity-cache";
import { invalidateIdentityCache as invalidateCanonical } from "@/lib/canonical-identity";

export interface IdentityUpdate {
  userId: string;
  orbitId?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

/**
 * Propagate an identity change to all surfaces.
 * Call after: avatar upload, name change, profile edit.
 */
export function propagateIdentityChange(update: IdentityUpdate) {
  // 1. Invalidate all caches for this user
  invalidateCache(update.userId);
  invalidateCanonical();

  // 2. Emit canonical event for all listeners
  platformBus.emit("orbit:identity_updated", {
    userId: update.userId,
    orbitId: update.orbitId,
    displayName: update.displayName,
    avatarUrl: update.avatarUrl,
  }, "identity", { userId: update.userId });
}

/**
 * Avatar resolution policy — single canonical rule.
 * Priority: 1. Registered contact photo → 2. Orbit profile photo → 3. Initials
 */
export function resolveAvatarUrl(
  contactAvatarUrl?: string | null,
  profileAvatarUrl?: string | null,
): string | null {
  return contactAvatarUrl || profileAvatarUrl || null;
}

/**
 * Format "member since" — canonical date formatting.
 * Returns human-readable "Member since" string.
 */
export function formatMemberSince(createdAt: string | null | undefined): string {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return "";
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}
