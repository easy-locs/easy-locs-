/**
 * broadcast.create — Canonical broadcast list creation.
 */

export interface BroadcastListPayload {
  title: string;
  recipientIds: string[];
  createdByUserId: string;
}

export const BroadcastCreate = {
  /** Validate broadcast list */
  validate(payload: BroadcastListPayload): { valid: boolean; error?: string } {
    if (!payload.title.trim()) return { valid: false, error: "List title is required" };
    if (payload.recipientIds.length < 1) return { valid: false, error: "At least one recipient required" };
    return { valid: true };
  },

  /** Build canonical broadcast list object */
  build(payload: BroadcastListPayload) {
    return {
      type: "broadcast" as const,
      title: payload.title.trim(),
      recipientIds: [...new Set(payload.recipientIds)],
      createdByUserId: payload.createdByUserId,
      recipientCount: new Set(payload.recipientIds).size,
    };
  },
};
