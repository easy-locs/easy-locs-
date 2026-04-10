/**
 * ContactProfileViewModel — Canonical view model for contact profiles.
 * Used by: ContactProfileSheet, contact cards, member cards, call identity.
 */
import { resolveCanonicalDisplayIdentity, type CanonicalDisplayIdentity } from "@/lib/orbit/canonical-helpers";
import { formatMemberSince } from "./identity-propagation";

export interface ContactProfileViewModel {
  userId: string | null;
  orbitId: string | null;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
  subtitle: string;
  email: string | null;
  phone: string | null;
  memberSince: string;
  isKnownContact: boolean;

  // Actions availability
  canMessage: boolean;
  canCall: boolean;
  canVideoCall: boolean;
  canBlock: boolean;
}

export function buildContactProfileVM(entity: {
  display_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  company?: string | null;
  role?: string | null;
  id?: string | null;
  user_id?: string | null;
  orbit_id?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
} | null): ContactProfileViewModel {
  if (!entity) {
    return {
      userId: null, orbitId: null, displayName: "Contact",
      avatarUrl: null, initials: "?", subtitle: "", email: null,
      phone: null, memberSince: "", isKnownContact: false,
      canMessage: false, canCall: false, canVideoCall: false, canBlock: false,
    };
  }

  const identity = resolveCanonicalDisplayIdentity(entity);
  const hasUserId = !!(entity.user_id || entity.id);

  return {
    userId: entity.user_id || entity.id || null,
    orbitId: entity.orbit_id || null,
    displayName: identity.displayName,
    avatarUrl: identity.avatarUrl,
    initials: identity.initials,
    subtitle: identity.subtitle,
    email: null,
    phone: entity.phone || null,
    memberSince: formatMemberSince(entity.created_at || entity.createdAt),
    isKnownContact: identity.displayName !== "Contact",
    canMessage: hasUserId,
    canCall: hasUserId,
    canVideoCall: hasUserId,
    canBlock: hasUserId,
  };
}
