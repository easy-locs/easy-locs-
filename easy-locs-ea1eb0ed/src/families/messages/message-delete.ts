/**
 * message.delete — Canonical message deletion family.
 * Handles: delete-for-self, delete-for-all, grouped delete, preview reconciliation.
 */
import { supabase } from "@/integrations/supabase/client";
import { updateConversationTimestamp } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";

const db = supabase as any;

export type DeleteScope = "self" | "all";

export interface DeleteResult {
  messageId: string;
  scope: DeleteScope;
  success: boolean;
  error?: string;
}

export const MessageDelete = {
  /** Delete a message for self only (soft-hide) */
  async deleteForSelf(messageId: string, userId: string): Promise<DeleteResult> {
    try {
      const { error } = await db
        .from("chat_messages_v2")
        .update({
          metadata: db.rpc ? undefined : undefined, // preserve metadata
          deleted_for: db.sql
            ? undefined
            : [userId], // ideally append to array
        })
        .eq("id", messageId);

      // Fallback: use a separate soft-delete tracking approach
      // Store deletion in metadata
      const { data: msg } = await db
        .from("chat_messages_v2")
        .select("metadata")
        .eq("id", messageId)
        .single();

      const meta = msg?.metadata || {};
      const deletedFor = Array.isArray(meta.deleted_for) ? meta.deleted_for : [];
      if (!deletedFor.includes(userId)) {
        deletedFor.push(userId);
      }

      await db
        .from("chat_messages_v2")
        .update({ metadata: { ...meta, deleted_for: deletedFor } })
        .eq("id", messageId);

      return { messageId, scope: "self", success: true };
    } catch (err: any) {
      return { messageId, scope: "self", success: false, error: err?.message };
    }
  },

  /** Delete a message for all participants */
  async deleteForAll(
    messageId: string,
    conversationId: string,
    userId: string,
  ): Promise<DeleteResult> {
    try {
      const now = new Date().toISOString();
      await db
        .from("chat_messages_v2")
        .update({
          body: "🚫 This message was deleted",
          metadata: {
            deleted: true,
            deleted_by: userId,
            deleted_at: now,
            original_type: "redacted",
          },
          type: "system",
        })
        .eq("id", messageId);

      await updateConversationTimestamp(conversationId, "🚫 Message deleted");

      platformBus.emit("orbit:message_deleted", {
        messageId,
        conversationId,
        scope: "all",
      }, "orbit", { userId });

      return { messageId, scope: "all", success: true };
    } catch (err: any) {
      return { messageId, scope: "all", success: false, error: err?.message };
    }
  },

  /** Bulk delete messages */
  async deleteBulk(
    messageIds: string[],
    conversationId: string,
    userId: string,
    scope: DeleteScope,
  ): Promise<DeleteResult[]> {
    const results: DeleteResult[] = [];
    for (const id of messageIds) {
      const result = scope === "all"
        ? await MessageDelete.deleteForAll(id, conversationId, userId)
        : await MessageDelete.deleteForSelf(id, userId);
      results.push(result);
    }
    return results;
  },

  /** Check if a message is deleted for a specific user */
  isDeletedForUser(msg: any, userId: string): boolean {
    const meta = msg?.metadata_json || msg?.metadata || {};
    if (meta?.deleted) return true;
    if (Array.isArray(meta?.deleted_for) && meta.deleted_for.includes(userId)) return true;
    return false;
  },

  /** Check if a message is globally deleted */
  isDeletedForAll(msg: any): boolean {
    const meta = msg?.metadata_json || msg?.metadata || {};
    return !!meta?.deleted;
  },

  /** Get display state for a deleted message */
  getDeletedDisplayState(msg: any, userId: string): "visible" | "deleted_self" | "deleted_all" {
    if (MessageDelete.isDeletedForAll(msg)) return "deleted_all";
    if (MessageDelete.isDeletedForUser(msg, userId)) return "deleted_self";
    return "visible";
  },
};
