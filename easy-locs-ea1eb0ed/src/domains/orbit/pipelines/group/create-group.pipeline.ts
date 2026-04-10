/**
 * createGroupPipeline — Canonical group conversation creation.
 *
 * Steps:
 * 1. Validate input (title, members)
 * 2. Deduplicate members
 * 3. Create conversation with idempotency
 * 4. Add participants
 * 5. Send system welcome message
 */

export interface CreateGroupInput {
  title: string;
  memberUserIds: string[];
  avatarUrl?: string | null;
  createdByUserId: string;
  createdByOrbitId?: string;
}

/**
 * Validate group creation input.
 */
export function validateGroupInput(input: CreateGroupInput): string | null {
  if (!input.title?.trim()) return "missing_title";
  if (!input.memberUserIds?.length) return "no_members";
  if (input.memberUserIds.length < 1) return "min_2_members"; // creator + at least 1
  if (input.memberUserIds.length > 256) return "max_256_members";
  if (!input.createdByUserId) return "missing_creator";
  return null;
}

/**
 * Deduplicate and include creator in member list.
 */
export function deduplicateMembers(
  creatorId: string,
  memberIds: string[],
): string[] {
  const unique = new Set([creatorId, ...memberIds]);
  return Array.from(unique);
}
