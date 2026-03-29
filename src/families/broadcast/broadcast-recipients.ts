/**
 * broadcast.recipients — Canonical recipient management for broadcast lists.
 */

export const BroadcastRecipients = {
  /** Deduplicate recipient IDs */
  deduplicate(ids: string[]): string[] {
    return [...new Set(ids)];
  },

  /** Add recipients (deduped) */
  add(current: string[], newIds: string[]): string[] {
    return [...new Set([...current, ...newIds])];
  },

  /** Remove recipients */
  remove(current: string[], removeIds: string[]): string[] {
    const removeSet = new Set(removeIds);
    return current.filter((id) => !removeSet.has(id));
  },

  /** Validate all recipient IDs are non-empty UUIDs */
  validate(ids: string[]): { valid: boolean; invalidIds: string[] } {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalid = ids.filter((id) => !uuidRegex.test(id));
    return { valid: invalid.length === 0, invalidIds: invalid };
  },
};
