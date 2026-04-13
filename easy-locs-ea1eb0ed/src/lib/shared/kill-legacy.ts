import { APP_MODE } from "./app-mode";

const FORBIDDEN_TABLES = [
  "messages",
  "conversation_threads",
  "chat_threads",
] as const;

const FORBIDDEN_SET = new Set<string>(FORBIDDEN_TABLES);

export function killLegacyAccess(table: string) {
  if (APP_MODE.CORE_MODE !== "V2_ONLY") return;
  if (FORBIDDEN_SET.has(table)) {
    throw new Error(`[V2_KILL_SWITCH] Forbidden legacy table: "${table}". Use V2 equivalent.`);
  }
}

export function isLegacyTable(table: string): boolean {
  return FORBIDDEN_SET.has(table);
}
