/**
 * duplicateGuard — Stub. Duplicate detection removed during cleanup.
 */
export async function checkListingDuplicate(..._args: any[]): Promise<{ isDuplicate: false; blocked: false; existingMatch: { name: string } | null }> {
  return { isDuplicate: false, blocked: false, existingMatch: null };
}

export async function checkStorefrontDuplicate(..._args: any[]): Promise<{ isDuplicate: false; blocked: false; existingMatch: { name: string } | null; result: { reasons: string[] } }> {
  return { isDuplicate: false, blocked: false, existingMatch: null, result: { reasons: [] } };
}

export async function checkServiceDuplicate(..._args: any[]): Promise<{ isDuplicate: false; blocked: false; existingMatch: { name: string } | null }> {
  return { isDuplicate: false, blocked: false, existingMatch: null };
}
