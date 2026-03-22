/**
 * claimService — Stub for merchant claim token resolution.
 */
export async function resolveClaimToken(token: string) {
  return { valid: false, token, message: "Claim service unavailable" };
}

export async function verifyClaimToken(token: string) {
  return { valid: false, token };
}

export async function executeClaim(token: string) {
  return { success: false, token };
}
