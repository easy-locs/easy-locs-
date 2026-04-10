const LEGACY_BLOCKED_TABLES = [
  "messages",
  "conversation_threads",
  "message_reactions",
  "message_reads",
] as const;

export function assertNotLegacyTable(tableName: string) {
  if (LEGACY_BLOCKED_TABLES.includes(tableName as (typeof LEGACY_BLOCKED_TABLES)[number])) {
    throw new Error(
      `[V2_ONLY_GUARD] Legacy table access blocked: ${tableName}. Use V2+ canonical tables only.`
    );
  }
}

export function isLegacyTable(tableName: string) {
  return LEGACY_BLOCKED_TABLES.includes(tableName as (typeof LEGACY_BLOCKED_TABLES)[number]);
}
