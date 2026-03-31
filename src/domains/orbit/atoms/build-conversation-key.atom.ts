/**
 * ATOM: buildConversationKey — Pure key builder for conversation references.
 */
export function buildConversationKey(type: string, id: string): string {
  return `${type}:${id}`;
}

export function isValidMessageBody(body: string): boolean {
  return typeof body === "string" && body.trim().length > 0;
}

export function truncatePreview(body: string, maxLen = 80): string {
  const trimmed = body.trim();
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) + "…" : trimmed;
}
