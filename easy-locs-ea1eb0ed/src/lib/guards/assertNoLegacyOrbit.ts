/**
 * Guard: blocks runtime writes to decommissioned legacy Orbit tables.
 */
export function assertNoLegacyOrbitWrite(tableName: string) {
  const blocked = ["messages", "conversation_threads"];
  if (blocked.includes(tableName)) {
    throw new Error(
      `[V2+ ONLY] Illegal Orbit write attempted on legacy table "${tableName}". Use conversations_v2 / chat_messages_v2 only.`
    );
  }
}
