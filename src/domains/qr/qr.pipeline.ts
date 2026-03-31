/**
 * QR Pipeline — Parse, validate, resolve QR payloads into actionable intents.
 *
 * scan → parse → validate → resolve actionType → ready for execution
 */
import type { QrResolvedPayload, QrActionType } from "./qr.store";

/** Known QR URL patterns */
const QR_PATTERNS: Array<{ pattern: RegExp; actionType: QrActionType; extractId: (m: RegExpMatchArray) => string }> = [
  { pattern: /\/orbit\/([a-f0-9-]+)/i, actionType: "open_conversation", extractId: (m) => m[1] },
  { pattern: /\/pay\/([a-f0-9-]+)/i, actionType: "pay", extractId: (m) => m[1] },
  { pattern: /\/contact\/([a-f0-9-]+)/i, actionType: "add_contact", extractId: (m) => m[1] },
  { pattern: /\/group\/join\/([a-f0-9-]+)/i, actionType: "join_group", extractId: (m) => m[1] },
  { pattern: /\/menu\/([a-zA-Z0-9_-]+)/i, actionType: "open_menu", extractId: (m) => m[1] },
  { pattern: /\/entity\/([a-f0-9-]+)/i, actionType: "open_entity", extractId: (m) => m[1] },
  { pattern: /\/location\/([\d.-]+),([\d.-]+)/i, actionType: "open_location", extractId: (m) => `${m[1]},${m[2]}` },
];

/**
 * Parse raw QR string into resolved payload.
 */
export function parseQrPayload(raw: string): QrResolvedPayload {
  if (!raw?.trim()) {
    return { raw, actionType: "unknown", targetId: null, metadata: {} };
  }

  const trimmed = raw.trim();

  // Try JSON payloads first
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed);
      return {
        raw: trimmed,
        actionType: resolveActionTypeFromJson(json),
        targetId: json.id || json.targetId || json.entityId || null,
        metadata: json,
      };
    } catch {
      return { raw: trimmed, actionType: "unknown", targetId: null, metadata: { parseError: true } };
    }
  }

  // URL-based patterns
  for (const { pattern, actionType, extractId } of QR_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        raw: trimmed,
        actionType,
        targetId: extractId(match),
        metadata: { url: trimmed },
      };
    }
  }

  return { raw: trimmed, actionType: "unknown", targetId: null, metadata: {} };
}

function resolveActionTypeFromJson(json: any): QrActionType {
  const type = json.type || json.action || json._type;
  const KNOWN: QrActionType[] = [
    "open_conversation", "open_entity", "add_contact",
    "join_group", "open_menu", "pay", "open_location",
  ];
  if (KNOWN.includes(type)) return type;

  // Heuristic fallback
  if (json.amount || json.walletId) return "pay";
  if (json.conversationId) return "open_conversation";
  if (json.groupId) return "join_group";
  if (json.lat && json.lng) return "open_location";

  return "unknown";
}

/**
 * Validate a resolved QR payload.
 */
export function validateQrPayload(payload: QrResolvedPayload): string | null {
  if (payload.actionType === "unknown") return "unrecognized_qr_format";
  if (!payload.targetId && payload.actionType !== "open_location") return "missing_target_id";
  return null;
}
