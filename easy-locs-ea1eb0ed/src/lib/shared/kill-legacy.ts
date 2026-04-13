import { APP_MODE } from "./app-mode";

const FORBIDDEN_TABLES = [
  "messages",
  "conversation_threads",
  "chat_threads",
  "legacy_notifications",
  "orbit_messages",
  "orbit_threads",
  "message_reactions",
  "message_reads",
];

export function killLegacyAccess(table: string) {
  if (APP_MODE.CORE_MODE !== "V2_ONLY") return;
  if (FORBIDDEN_TABLES.includes(table)) {
    throw new Error(`[V2_KILL_SWITCH] Forbidden legacy table: "${table}". Use V2 equivalent.`);
  }
}

export function isLegacyTable(table: string): boolean {
  return FORBIDDEN_TABLES.includes(table);
}

export const LEGACY_TABLE_MAP: Record<string, string> = {
  messages: "chat_messages_v2",
  conversation_threads: "conversations_v2",
  chat_threads: "conversations_v2",
  legacy_notifications: "app_notifications",
  orbit_messages: "chat_messages_v2",
  orbit_threads: "conversations_v2",
  message_reactions: "chat_reactions_v2",
  message_reads: "chat_reads_v2",
};
