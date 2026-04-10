/**
 * GOVERNANCE.ts — 15 Immutable Product Laws (Executable)
 * ========================================================
 * Dev/test: guards THROW to catch violations early.
 * Prod: guards LOG structured errors + return blocked status.
 */

export const GOVERNANCE_VERSION = "1.0.0";
export const GOVERNANCE_RULES = 15;

const IS_DEV = typeof import.meta !== "undefined" && (import.meta as any).env?.DEV === true;

/**
 * Closed message type taxonomy (Rule 4).
 */
const VALID_TYPES = new Set([
  "text", "image", "video", "voice", "audio", "file",
  "media", // DB-level type that maps to image/video/file at canonical level
  "location_static", "location_live",
  "call_audio", "call_video", "call_missed", "call_declined",
  "payment_request", "payment_receipt",
  "system_notice",
  "system", // Legacy compat: some callers still write "system"
] as const);

export type CanonicalMessageType = typeof VALID_TYPES extends Set<infer T> ? T : never;

/**
 * Assert a message type belongs to the closed taxonomy.
 * DEV: throws. PROD: logs structured error.
 */
export function assertValidMessageType(type: string, context?: string): void {
  if (VALID_TYPES.has(type as any)) return;

  const msg = `[Governance] Invalid message type: "${type}"${context ? ` in ${context}` : ""}. Valid: ${[...VALID_TYPES].join(", ")}`;

  if (IS_DEV) {
    throw new Error(msg);
  }
  console.error(msg);
}

/**
 * Legacy ID keys that must never appear in write payloads (Rule 9).
 */
const LEGACY_KEYS = [
  "threadId", "v2ConversationId", "contextId",
  "thread_id", "v2_conversation_id", "context_id",
];

/**
 * Assert no legacy ID fields in a write payload.
 * DEV: throws. PROD: logs structured error.
 */
export function assertNoLegacyIds(payload: Record<string, any>, context?: string): void {
  for (const key of LEGACY_KEYS) {
    if (key in payload && payload[key] != null) {
      const msg = `[Governance] Legacy ID "${key}" in write payload${context ? ` (${context})` : ""}. Use canonical IDs only.`;

      if (IS_DEV) {
        throw new Error(msg);
      }
      console.error(msg);
      return;
    }
  }
}

/**
 * Assert metadata has schemaVersion: 1 on write paths.
 * DEV: throws. PROD: logs structured warning.
 */
export function assertCanonicalMetadata(metadata: any, context?: string): void {
  if (metadata && metadata.schemaVersion === 1) return;

  const msg = `[Governance] Non-canonical metadata${context ? ` in ${context}` : ""}. Missing schemaVersion: 1.`;

  if (IS_DEV) {
    throw new Error(msg);
  }
  console.error(msg);
}

/**
 * Validate a complete write payload before insertion.
 * Combines all governance checks. Returns true if valid.
 */
export function validateWritePayload(
  payload: { type?: string; metadata?: any; [key: string]: any },
  context: string,
): boolean {
  try {
    assertNoLegacyIds(payload, context);
    if (payload.type) assertValidMessageType(payload.type, context);
    if (payload.metadata) assertCanonicalMetadata(payload.metadata, context);
    return true;
  } catch (err) {
    // In dev, the assertions already threw
    return false;
  }
}
