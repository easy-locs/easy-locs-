/**
 * assert-canonical-write — Hard-fail guard for legacy IDs in write flows.
 * Import and call at the top of any write function to block legacy identifiers.
 */

const LEGACY_KEYS = ["threadId", "v2ConversationId", "contextId", "thread_id", "context_id"] as const;

export function assertNoLegacyIds(
  source: Record<string, any>,
  flowName: string,
): void {
  for (const key of LEGACY_KEYS) {
    if (source[key] !== undefined && source[key] !== null) {
      const msg = `❌ LEGACY ID "${key}" detected in write flow [${flowName}]. Value: ${source[key]}. Use canonical IDs (conversationId, entityId).`;
      console.error(msg, { source });
      throw new Error(msg);
    }
  }
}
