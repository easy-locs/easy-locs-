/**
 * message.bulk-actions — Canonical bulk action family for selected messages.
 * Handles: bulk copy, forward, delete, export.
 */
import { MessageForward } from "./message-forward";
import { MessageDelete } from "./message-delete";
import type { DeleteScope } from "./message-delete";

export type BulkAction = "copy" | "forward" | "delete_self" | "delete_all" | "share";

export interface BulkActionResult {
  action: BulkAction;
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

export const MessageBulkActions = {
  /** Copy text content of selected messages to clipboard */
  async bulkCopy(messages: any[]): Promise<BulkActionResult> {
    try {
      const sorted = [...messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      const text = sorted
        .map((m) => m.body || "")
        .filter(Boolean)
        .join("\n\n");

      await navigator.clipboard.writeText(text);
      return { action: "copy", total: messages.length, succeeded: messages.length, failed: 0, errors: [] };
    } catch (err: any) {
      return { action: "copy", total: messages.length, succeeded: 0, failed: messages.length, errors: [err?.message || "Copy failed"] };
    }
  },

  /** Forward selected messages to a target conversation */
  async bulkForward(
    messages: any[],
    targetConversationId: string,
    senderUserId: string,
    senderOrbitId: string,
  ): Promise<BulkActionResult> {
    const payloads = MessageForward.buildBulkPayloads(messages);
    const errors: string[] = [];
    let succeeded = 0;

    for (const payload of payloads) {
      try {
        await MessageForward.forwardSingle(payload, targetConversationId, senderUserId, senderOrbitId);
        succeeded++;
      } catch (err: any) {
        errors.push(err?.message || "Forward failed");
      }
    }

    return {
      action: "forward",
      total: messages.length,
      succeeded,
      failed: messages.length - succeeded,
      errors,
    };
  },

  /** Delete selected messages */
  async bulkDelete(
    messageIds: string[],
    conversationId: string,
    userId: string,
    scope: DeleteScope,
  ): Promise<BulkActionResult> {
    const results = await MessageDelete.deleteBulk(messageIds, conversationId, userId, scope);
    const failed = results.filter((r) => !r.success);
    return {
      action: scope === "all" ? "delete_all" : "delete_self",
      total: messageIds.length,
      succeeded: results.filter((r) => r.success).length,
      failed: failed.length,
      errors: failed.map((r) => r.error || "Delete failed"),
    };
  },

  /** Get available bulk actions based on selected messages */
  getAvailableBulkActions(opts: {
    hasText: boolean;
    isOwner: boolean;
    isAdmin?: boolean;
    count: number;
  }): BulkAction[] {
    const actions: BulkAction[] = [];
    if (opts.count === 0) return actions;

    if (opts.hasText) actions.push("copy");
    actions.push("forward");
    actions.push("delete_self");
    if (opts.isOwner || opts.isAdmin) actions.push("delete_all");
    actions.push("share");

    return actions;
  },
};
