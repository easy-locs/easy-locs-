/**
 * claimService — Stub for merchant claim token resolution.
 */
export async function resolveClaimToken(token: string) {
  return { valid: false, token, message: "Claim service unavailable" };
}
