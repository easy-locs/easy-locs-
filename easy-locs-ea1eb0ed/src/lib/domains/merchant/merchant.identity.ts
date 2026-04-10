/**
 * merchant.identity — Core merchant identification.
 */

export interface MerchantIdentity {
  id: string;
  slug: string;
  name: string;
  legalName?: string;
  ownerUserId: string;
  orgId?: string;
  vertical: "food" | "hotel" | "shop" | "service" | "grocery";
  createdAt: string;
}

export function buildMerchantSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function isValidMerchantId(id: string): boolean {
  return typeof id === "string" && id.length >= 10;
}
