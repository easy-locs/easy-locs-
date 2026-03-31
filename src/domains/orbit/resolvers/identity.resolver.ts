/**
 * identity.resolver — SINGLE canonical source for display name and avatar resolution.
 *
 * RULES:
 * - resolveDisplayName: the ONE function to produce a displayable name from any entity
 * - resolveAvatar: the ONE function to produce an avatar URL from any entity
 * - No other file may compute display names or avatar URLs independently.
 *
 * Resolution priority: explicit name → profile name → email prefix → phone → fallback
 */

export interface IdentitySource {
  displayName?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
}

const DEFAULT_NAME = "Contact";

/**
 * resolveDisplayName — Single canonical display name resolver.
 *
 * Priority:
 * 1. displayName (if non-empty)
 * 2. name (if non-empty)
 * 3. firstName + lastName combined
 * 4. first_name + last_name combined (snake_case variant)
 * 5. Email prefix (before @)
 * 6. Phone number
 * 7. Fallback default
 */
export function resolveDisplayName(
  source: IdentitySource | null | undefined,
  fallback: string = DEFAULT_NAME,
): string {
  if (!source) return fallback;

  // 1. Explicit displayName
  if (source.displayName?.trim()) return source.displayName.trim();

  // 2. Generic name
  if (source.name?.trim()) return source.name.trim();

  // 3. First + Last (camelCase)
  const first = source.firstName?.trim() || source.first_name?.trim();
  const last = source.lastName?.trim() || source.last_name?.trim();
  if (first || last) return [first, last].filter(Boolean).join(" ");

  // 4. Email prefix
  if (source.email?.trim()) {
    const prefix = source.email.split("@")[0];
    if (prefix) return prefix;
  }

  // 5. Phone
  if (source.phone?.trim()) return source.phone.trim();

  return fallback;
}

/**
 * resolveAvatar — Single canonical avatar URL resolver.
 *
 * Priority:
 * 1. avatarUrl
 * 2. avatar_url (snake_case)
 * 3. photo_url
 * 4. null
 */
export function resolveAvatar(
  source: IdentitySource | null | undefined,
): string | null {
  if (!source) return null;
  return source.avatarUrl?.trim() || source.avatar_url?.trim() || source.photo_url?.trim() || null;
}
