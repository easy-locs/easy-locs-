/**
 * draftPipeline — Canonical draft management.
 * One draft per conversation, persisted and restored.
 */
import type { OrbitDraft } from "../../types";

/** In-memory draft store (syncs to composer.store) */
const drafts = new Map<string, OrbitDraft>();

export function captureDraft(conversationId: string, text: string): void {
  if (!text.trim()) {
    drafts.delete(conversationId);
    return;
  }
  drafts.set(conversationId, {
    id: conversationId,
    conversationId,
    text,
    attachments: [],
    updatedAt: new Date().toISOString(),
  });
}

export function restoreDraft(conversationId: string): OrbitDraft | null {
  return drafts.get(conversationId) || null;
}

export function clearDraft(conversationId: string): void {
  drafts.delete(conversationId);
}

export function hasDraft(conversationId: string): boolean {
  return drafts.has(conversationId) && (drafts.get(conversationId)!.text.trim().length > 0);
}
