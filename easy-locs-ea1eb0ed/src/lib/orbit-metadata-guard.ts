/**
 * Orbit Metadata Guard — Minimizes metadata exposure
 * 
 * Strips sensitive fields before storing messages,
 * and provides utilities for metadata reduction.
 */

/** Fields that should NOT be stored in message metadata */
const SENSITIVE_FIELDS = [
  "ip_address",
  "user_agent", 
  "device_info",
  "exact_location",
  "browser_fingerprint",
] as const;

/** Sanitize message content metadata before insert */
export function sanitizeMessageForStorage(msg: Record<string, any>): Record<string, any> {
  const clean = { ...msg };
  for (const field of SENSITIVE_FIELDS) {
    delete clean[field];
  }
  return clean;
}

/** Strip IP / user-agent from audit log metadata */
export function sanitizeAuditMeta(meta: Record<string, any>): Record<string, any> {
  const clean = { ...meta };
  delete clean.ip_address;
  delete clean.user_agent;
  delete clean.raw_headers;
  return clean;
}

/** Minimal notification payload — no message content in push */
export function createMinimalNotificationPayload(opts: {
  type: string;
  threadId?: string;
  senderId?: string;
}) {
  return {
    type: opts.type,
    thread_id: opts.threadId || null,
    // Don't include message content or sender identity in push payload
    body: "New message",
  };
}

/** Check if a message is E2E encrypted */
export function isE2EEncrypted(content: string): boolean {
  return content?.startsWith("e2e:") ?? false;
}

/** Get a safe display preview for encrypted messages */
export function getEncryptedPreview(): string {
  return "🔒 Encrypted message";
}
