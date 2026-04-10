/**
 * Delta Sync — Only fetches changes since last known cursor.
 * Avoids full reloads, supports snapshot + patch model.
 */

import { db } from "@/services/db";

const CURSOR_STORE_KEY = "orbit_sync_cursors";

interface SyncCursors {
  /** Last conversation update cursor (ISO timestamp) */
  lastConversationCursor: string | null;
  /** Per-conversation message cursors */
  messagesCursors: Record<string, string>;
  /** Last full sync timestamp */
  lastFullSync: string | null;
}

/** Get stored cursors from localStorage */
export function getSyncCursors(): SyncCursors {
  try {
    const raw = localStorage.getItem(CURSOR_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { lastConversationCursor: null, messagesCursors: {}, lastFullSync: null };
}

/** Persist cursors */
export function saveSyncCursors(cursors: SyncCursors): void {
  try {
    localStorage.setItem(CURSOR_STORE_KEY, JSON.stringify(cursors));
  } catch {}
}

/** Update a single conversation message cursor */
export function updateMessageCursor(conversationId: string, timestamp: string): void {
  const cursors = getSyncCursors();
  cursors.messagesCursors[conversationId] = timestamp;
  saveSyncCursors(cursors);
}

/** Update the conversation list cursor */
export function updateConversationCursor(timestamp: string): void {
  const cursors = getSyncCursors();
  cursors.lastConversationCursor = timestamp;
  saveSyncCursors(cursors);
}

/**
 * Fetch only conversations updated since last cursor.
 * Falls back to full fetch if no cursor exists.
 */
export async function deltaFetchConversations(userId: string, limit = 100) {
  const cursors = getSyncCursors();
  let query = db
    .from("conversations_v2")
    .select("*")
    .contains("participants", [userId])
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (cursors.lastConversationCursor) {
    query = query.gt("updated_at", cursors.lastConversationCursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Update cursor to most recent
  if (data?.length > 0) {
    updateConversationCursor(data[0].updated_at);
  }

  return data || [];
}

/**
 * Fetch only messages newer than last cursor for a conversation.
 */
export async function deltaFetchMessages(conversationId: string, limit = 50) {
  const cursors = getSyncCursors();
  const lastCursor = cursors.messagesCursors[conversationId];

  let query = db
    .from("chat_messages_v2")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (lastCursor) {
    query = query.gt("created_at", lastCursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Update cursor
  if (data?.length > 0) {
    const newest = data[0].created_at;
    updateMessageCursor(conversationId, newest);
  }

  return data || [];
}

/**
 * Mark full sync completed.
 */
export function markFullSyncComplete(): void {
  const cursors = getSyncCursors();
  cursors.lastFullSync = new Date().toISOString();
  saveSyncCursors(cursors);
}

/**
 * Check if a full sync is needed (e.g., first launch or stale data).
 */
export function needsFullSync(): boolean {
  const cursors = getSyncCursors();
  if (!cursors.lastFullSync) return true;
  // Re-sync if older than 24h
  const age = Date.now() - new Date(cursors.lastFullSync).getTime();
  return age > 24 * 60 * 60 * 1000;
}

/** Reset all cursors (for debugging or fresh start) */
export function resetSyncCursors(): void {
  localStorage.removeItem(CURSOR_STORE_KEY);
}
