/**
 * duplicateGuard — Stub. Duplicate detection removed during cleanup.
 */
export async function checkListingDuplicate(..._args: any[]): Promise<{ isDuplicate: false; blocked: false; existingMatch: null }> {
  return { isDuplicate: false, blocked: false, existingMatch: null };
}

export async function checkStorefrontDuplicate(..._args: any[]): Promise<{ isDuplicate: false; blocked: false; existingMatch: null; result: null }> {
  return { isDuplicate: false, blocked: false, existingMatch: null, result: null };
}

export async function checkServiceDuplicate(..._args: any[]): Promise<{ isDuplicate: false }> {
  return { isDuplicate: false };
}
