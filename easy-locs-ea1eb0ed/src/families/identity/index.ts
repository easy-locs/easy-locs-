/**
 * FAMILY: IDENTITY — Canonical identity resolution for the entire app.
 * Single source of truth. All modules must use this family for user/entity display.
 *
 * Owns: avatar resolution, name resolution, member since, identity propagation,
 * contact profile VM, conversation header VM, group profile VM.
 */
import { db as supabase } from "@/services/db";

// ── Re-export canonical identity resolver ──
export {
  resolveCanonicalDisplayIdentity,
  resolvePeerIdentity,
  resolveCallablePeer,
  resolveNotificationIdentity,
  type CanonicalDisplayIdentity,
  type PeerIdentity,
  type CallablePeer,
  type NotificationIdentity,
} from "@/lib/orbit/canonical-helpers";

// ── Re-export orbit identity hook (reactive) ──
export {
  useOrbitIdentity,
  getOrbitIdentity,
  requireOrbitIdentity,
  type OrbitIdentity,
} from "@/hooks/useOrbitIdentity";

// ── Re-export canonical identity chain ──
export {
  getCanonicalIdentity,
  invalidateIdentityCache,
  peekIdentity,
  type CanonicalIdentity,
  type IdentityMode,
} from "@/lib/canonical-identity";

// ── Canonical UI components ──
export { IdentityAvatar } from "@/components/orbit/IdentityAvatar";

// ── Canonical hooks ──
export { useResolvedIdentity } from "@/hooks/useResolvedIdentity";

// ── Identity propagation (avatar/name updates → all surfaces) ──
export { propagateIdentityChange, resolveAvatarUrl, formatMemberSince } from "./identity-propagation";
export type { IdentityUpdate } from "./identity-propagation";

// ── Identity cache ──
export { getCachedIdentity, setCachedIdentity, invalidateIdentityCache as invalidateProfileCache } from "@/lib/cache/identity-cache";

// ── Avatar store ──
export { useAvatarStore } from "@/stores/avatarStore";

// ── View Models ──
export { buildContactProfileVM } from "./contact-profile-vm";
export type { ContactProfileViewModel } from "./contact-profile-vm";
export { buildConversationHeaderVM } from "./conversation-header-vm";
export type { ConversationHeaderViewModel } from "./conversation-header-vm";
export { buildGroupProfileVM } from "./group-profile-vm";
export type { GroupProfileViewModel, GroupMemberViewModel } from "./group-profile-vm";

/**
 * Canonical getCurrentUserId — SINGLE implementation for the entire app.
 */
export async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function getCurrentUserIdOrNull(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export { resolveCanonicalDisplayIdentity as resolveIdentity } from "@/lib/orbit/canonical-helpers";
