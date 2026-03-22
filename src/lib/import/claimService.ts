/**
 * claimService — Stub for merchant claim token resolution.
 */
export async function resolveClaimToken(token: string) {
  return { valid: false, token, message: "Claim service unavailable" };
}

export async function verifyClaimToken(token: string) {
  return { valid: false, token, storefront: null as any, reason: "Service unavailable" };
}

export async function executeClaim(..._args: any[]) {
  return { success: false, error: "Service unavailable" };
}
