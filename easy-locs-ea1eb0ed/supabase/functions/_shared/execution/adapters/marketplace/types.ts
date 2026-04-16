/**
 * MarketplaceAdapter — payload typings + validation (task #754).
 */

export const MARKETPLACE_DOMAIN = "marketplace";
export const MARKETPLACE_TASK_TYPES = {
  PUBLISH: "MARKETPLACE.LISTING.PUBLISH",
  UNPUBLISH: "MARKETPLACE.LISTING.UNPUBLISH",
} as const;

export type MarketplaceTaskType =
  (typeof MARKETPLACE_TASK_TYPES)[keyof typeof MARKETPLACE_TASK_TYPES];

export interface PublishListingPayload {
  listingId: string;
  ownerId: string;
  reason?: string;
  payload_hash?: string;
  /** Snapshot of previous_state, written by the adapter before mutation. */
  previous_state?: ListingSnapshot | null;
}

export interface UnpublishListingPayload {
  listingId: string;
  ownerId?: string;
  reason?: string;
  payload_hash?: string;
  previous_state?: ListingSnapshot | null;
}

export interface ListingSnapshot {
  id: string;
  status: string | null;
  is_published?: boolean | null;
  visibility_mode?: string | null;
}

export const MARKETPLACE_ERROR_CODES = {
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  LISTING_NOT_FOUND: "LISTING_NOT_FOUND",
  KYC_BLOCKED: "KYC_BLOCKED",
  MUTATION_FAILED: "MUTATION_FAILED",
  VERIFICATION_MISMATCH: "VERIFICATION_MISMATCH",
} as const;

export type MarketplaceErrorCode =
  (typeof MARKETPLACE_ERROR_CODES)[keyof typeof MARKETPLACE_ERROR_CODES];

export interface ValidationResult<T> {
  ok: boolean;
  data?: T;
  reason?: string;
}

export function validatePublishPayload(p: unknown): ValidationResult<PublishListingPayload> {
  if (!p || typeof p !== "object") return { ok: false, reason: "payload must be an object" };
  const obj = p as Record<string, unknown>;
  const listingId = typeof obj.listingId === "string" ? obj.listingId.trim() : "";
  const ownerId = typeof obj.ownerId === "string" ? obj.ownerId.trim() : "";
  if (!listingId) return { ok: false, reason: "listingId is required" };
  if (!ownerId) return { ok: false, reason: "ownerId is required" };
  return {
    ok: true,
    data: {
      listingId,
      ownerId,
      reason: typeof obj.reason === "string" ? obj.reason : undefined,
      payload_hash: typeof obj.payload_hash === "string" ? obj.payload_hash : undefined,
    },
  };
}

export function validateUnpublishPayload(p: unknown): ValidationResult<UnpublishListingPayload> {
  if (!p || typeof p !== "object") return { ok: false, reason: "payload must be an object" };
  const obj = p as Record<string, unknown>;
  const listingId = typeof obj.listingId === "string" ? obj.listingId.trim() : "";
  if (!listingId) return { ok: false, reason: "listingId is required" };
  return {
    ok: true,
    data: {
      listingId,
      ownerId: typeof obj.ownerId === "string" ? obj.ownerId : undefined,
      reason: typeof obj.reason === "string" ? obj.reason : undefined,
      payload_hash: typeof obj.payload_hash === "string" ? obj.payload_hash : undefined,
    },
  };
}
