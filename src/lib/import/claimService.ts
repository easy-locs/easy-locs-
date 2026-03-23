/**
 * claimService — Merchant claim token resolution backed by source-hygiene.
 */
import { claimShop, findDuplicateShops } from "@/lib/source/source-hygiene";

export async function resolveClaimToken(token: string) {
  // Token format: "claim_{shopId}" — simple for now
  const shopId = token.startsWith("claim_") ? token.slice(6) : null;
  if (!shopId) return { valid: false, token, message: "Invalid claim token format" };
  return { valid: true, token, shopId, message: "Token valid" };
}

export async function verifyClaimToken(token: string) {
  const resolved = await resolveClaimToken(token);
  if (!resolved.valid) return { valid: false, token, storefront: null as any, reason: resolved.message };
  return { valid: true, token, storefront: { id: resolved.shopId }, reason: null };
}

export async function executeClaim(params: {
  shopId: string;
  userId: string;
  orgId: string;
  verificationMethod?: "phone" | "email" | "manual";
}) {
  return claimShop({
    shopId: params.shopId,
    userId: params.userId,
    orgId: params.orgId,
    verificationMethod: params.verificationMethod ?? "manual",
  });
}

export { findDuplicateShops };
