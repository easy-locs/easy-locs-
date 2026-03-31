/**
 * MICRON: validateMessageBody — Validates and sanitizes message content.
 */
import { isValidMessageBody } from "../atoms/build-conversation-key.atom";

export type MessageValidation = { ok: true; sanitized: string } | { ok: false; reason: string };

export function validateMessageBody(body: string): MessageValidation {
  if (!isValidMessageBody(body)) {
    return { ok: false, reason: "Message body cannot be empty" };
  }
  const sanitized = body.trim();
  if (sanitized.length > 10_000) {
    return { ok: false, reason: "Message too long (max 10000 chars)" };
  }
  return { ok: true, sanitized };
}
