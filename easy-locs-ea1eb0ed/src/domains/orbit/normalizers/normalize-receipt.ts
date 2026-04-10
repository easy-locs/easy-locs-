/**
 * normalizeReceipt — Transform raw receipt data into OrbitReceipt.
 */
import type { OrbitReceipt, ReceiptKind } from "../types";

export function normalizeReceipt(raw: any): OrbitReceipt {
  return {
    id: raw.id || crypto.randomUUID(),
    messageId: raw.message_id || raw.messageId || "",
    userId: raw.user_id || raw.userId || "",
    kind: resolveReceiptKind(raw),
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
  };
}

function resolveReceiptKind(raw: any): ReceiptKind {
  const k = raw.kind || raw.type || raw.receipt_type;
  if (k === "read" || k === "delivered") return k;
  if (raw.read_at) return "read";
  return "delivered";
}
