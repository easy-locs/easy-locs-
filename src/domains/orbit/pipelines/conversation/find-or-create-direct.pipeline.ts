/**
 * findOrCreateDirectPipeline — Idempotent direct conversation resolution.
 * Rule: One pair = One thread. Always.
 *
 * Steps:
 * 1. Normalize participant pair (sorted)
 * 2. Search existing conversation by participants
 * 3. If found, return it
 * 4. If not found, create with idempotency
 */

/** Deterministic pair key for dedup. */
export function buildDirectPairKey(userA: string, userB: string): string {
  return [userA, userB].sort().join("::");
}

/** In-flight dedup map to prevent simultaneous creation. */
const inflightCreations = new Map<string, Promise<any>>();

/**
 * Find or create a direct conversation.
 * Uses dedup map to prevent parallel creation of the same pair.
 */
export async function findOrCreateDirect(
  userA: string,
  userB: string,
  searchFn: (pair: string[]) => Promise<any | null>,
  createFn: (pair: string[]) => Promise<any>,
): Promise<any> {
  const pairKey = buildDirectPairKey(userA, userB);
  const pair = [userA, userB].sort();

  // Check inflight
  const inflight = inflightCreations.get(pairKey);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      // Step 1: Search
      const existing = await searchFn(pair);
      if (existing) return existing;

      // Step 2: Create
      return await createFn(pair);
    } finally {
      inflightCreations.delete(pairKey);
    }
  })();

  inflightCreations.set(pairKey, promise);
  return promise;
}
