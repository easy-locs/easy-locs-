/**
 * resolveCanonicalMessageType — Single source of truth for message type resolution.
 * 
 * RULE: Every media message MUST have its canonical type resolved HERE.
 * No heuristics, no body parsing, no fallback guessing.
 */
import type { MessageType, AttachmentKind } from "../../types";

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/avif"];
const VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm", "video/avi", "video/mkv"];
const AUDIO_MIMES = ["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/mp4", "audio/aac", "audio/opus", "audio/flac"];

export interface ResolveTypeInput {
  /** Explicit kind override (highest priority) */
  explicitKind?: "image" | "video" | "voice" | "audio" | "file" | "location_static" | "location_live";
  /** File MIME type */
  mimeType?: string;
  /** Attachment kind (if already resolved) */
  attachmentKind?: AttachmentKind;
}

/**
 * Resolve the canonical OrbitMessage.type from input signals.
 * Priority: explicitKind > attachmentKind > mimeType > "file"
 */
export function resolveCanonicalMessageType(input: ResolveTypeInput): MessageType {
  // 1. Explicit kind (from flow entry)
  if (input.explicitKind) {
    switch (input.explicitKind) {
      case "image": return "image";
      case "video": return "video";
      case "voice": return "voice";
      case "audio": return "audio";
      case "file": return "file";
      case "location_static": return "location_static";
      case "location_live": return "location_live";
    }
  }

  // 2. Attachment kind
  if (input.attachmentKind) {
    switch (input.attachmentKind) {
      case "image": return "image";
      case "video": return "video";
      case "voice": return "voice";
      case "audio": return "audio";
      case "file": return "file";
      case "thumbnail": return "image";
    }
  }

  // 3. MIME type
  if (input.mimeType) {
    const mime = input.mimeType.toLowerCase();
    if (IMAGE_MIMES.some((m) => mime.startsWith(m.split("/")[0] + "/")) && mime.startsWith("image/")) return "image";
    if (VIDEO_MIMES.includes(mime) || mime.startsWith("video/")) return "video";
    if (AUDIO_MIMES.includes(mime) || mime.startsWith("audio/")) return "audio";
  }

  // 4. Default: file
  return "file";
}

/**
 * DEV assertion: Verify bubble type stability during reconciliation.
 * A message's canonical type must NEVER change once created.
 */
export function assertBubbleTypeStable(
  existingType: MessageType | undefined,
  incomingType: MessageType,
  messageId: string,
): void {
  if (!existingType) return; // First time — no existing
  if (existingType === incomingType) return; // Same — OK

  // Allow text→media upgrade (legacy reconciliation only)
  if (existingType === "text" && incomingType !== "text") {
    if (import.meta.env.DEV) {
      console.warn(`[assertBubbleTypeStable] Upgrading legacy text→${incomingType} for ${messageId}`);
    }
    return;
  }

  // Any other change is a violation
  console.error(`[assertBubbleTypeStable] TYPE MUTATION DETECTED`, {
    messageId,
    existingType,
    incomingType,
  });
}