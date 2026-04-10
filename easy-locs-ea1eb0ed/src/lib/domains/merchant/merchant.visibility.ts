/**
 * merchant.visibility — Visibility rules and publish eligibility.
 */

export type VisibilityMode = "public" | "unlisted" | "private" | "pending_review";

export interface MerchantVisibility {
  mode: VisibilityMode;
  isLive: boolean;
  publishedAt?: string;
  suspendedAt?: string;
  suspendReason?: string;
  searchable: boolean;
  mapVisible: boolean;
}

export function isPubliclyVisible(v: MerchantVisibility): boolean {
  return v.mode === "public" && v.isLive && !v.suspendedAt;
}

export function canPublish(qualityScore: number, hasContact: boolean): boolean {
  return qualityScore >= 40 && hasContact;
}
