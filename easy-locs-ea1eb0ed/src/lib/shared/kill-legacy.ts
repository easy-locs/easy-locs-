import { APP_MODE } from "./app-mode";

const FORBIDDEN_TABLES = [
  "messages",
  "conversation_threads",
  "chat_threads",
  "legacy_notifications",
];

export function killLegacyAccess(table: string) {
  if (APP_MODE.CORE_MODE !== "V2_ONLY") return;
  if (FORBIDDEN_TABLES.includes(table)) {
    throw new Error(`[V2_KILL_SWITCH] Forbidden legacy table: "${table}". Use V2 equivalent.`);
  }
}
