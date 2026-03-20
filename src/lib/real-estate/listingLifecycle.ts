/**
 * Real Estate Listing Lifecycle — Expiry, status transitions, freshness.
 */

export type SeasonalStatus = "draft" | "active" | "expiring_soon" | "expired" | "archived";

const EXPIRY_DAYS = 30;
const EXPIRING_SOON_DAYS = 5;

/** Compute seasonal status from raw listing fields */
export function computeSeasonalStatus(listing: {
  active?: boolean;
  status?: string;
  auto_expire?: boolean;
  listing_expires_at?: string | null;
  archived_at?: string | null;
}): SeasonalStatus {
  if (listing.status === "draft" || (!listing.active && listing.status === "draft")) return "draft";
  if (listing.archived_at || listing.status === "archived") return "archived";

  if (listing.auto_expire && listing.listing_expires_at) {
    const expiresAt = new Date(listing.listing_expires_at).getTime();
    const now = Date.now();
    if (expiresAt <= now) return "expired";
    if (expiresAt - now <= EXPIRING_SOON_DAYS * 86400000) return "expiring_soon";
  }

  if (listing.active) return "active";
  return "expired";
}

/** Days remaining until expiry, null if no expiry */
export function daysUntilExpiry(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

/** Whether listing is in the expiring-soon window */
export function isExpiringSoon(expiresAt: string | null | undefined): boolean {
  const days = daysUntilExpiry(expiresAt);
  return days !== null && days > 0 && days <= EXPIRING_SOON_DAYS;
}

/** Compute freshness score 0-1, where 1 = just published */
export function computeFreshnessScore(publishedAt: string | null | undefined): number {
  if (!publishedAt) return 0;
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const maxAgeMs = EXPIRY_DAYS * 86400000;
  return Math.max(0, Math.min(1, 1 - ageMs / maxAgeMs));
}

/** Format expiry for display */
export function formatExpiryLabel(expiresAt: string | null | undefined): string {
  const days = daysUntilExpiry(expiresAt);
  if (days === null) return "No expiry";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}
