/**
 * normalizeMessage — Converts a raw DB row (chat_messages_v2) into a CanonicalMessageEnvelope.
 * This is the ONLY place where legacy metadata formats are resolved.
 * After this function, all downstream code works with clean canonical data.
 */
import type {
  CanonicalMessageEnvelope,
  CanonicalMessageType,
  CanonicalMetadata,
  CanonicalCardType,
  CanonicalDeliveryStatus,
} from "./canonical-envelope";
import { resolveCardType } from "./canonical-envelope";

/**
 * Normalize any raw message row into a CanonicalMessageEnvelope.
 * Handles both legacy flat metadata and new canonical metadata.
 */
export function normalizeMessage(raw: any): CanonicalMessageEnvelope {
  if (!raw) {
    return emptyEnvelope();
  }

  const rawMeta = raw.metadata_json || raw.metadata || {};

  // If already canonical (schemaVersion=1), just map fields
  if (rawMeta?.schemaVersion === 1) {
    return {
      id: raw.id,
      conversationId: raw.conversation_id || raw.conversationId || "",
      senderUserId: raw.sender_user_id || raw.sender_id || null,
      senderOrbitId: raw.sender_orbit_id || null,
      receiverOrbitId: raw.receiver_orbit_id || null,
      type: raw.type || raw.message_type || "text",
      body: raw.body || raw.content || "",
      metadata: rawMeta as CanonicalMetadata,
      createdAt: raw.created_at || new Date().toISOString(),
      updatedAt: raw.updated_at || null,
      readAt: raw.read_at || null,
      deletedAt: raw.deleted_at || null,
      editedAt: raw.edited_at || null,
      status: resolveStatus(raw),
    };
  }

  // Legacy normalization
  const type = resolveType(raw, rawMeta);
  const cardType = resolveCardType(type);
  const metadata = buildCanonicalMetadata(type, cardType, raw, rawMeta);

  return {
    id: raw.id,
    conversationId: raw.conversation_id || raw.conversationId || "",
    senderUserId: raw.sender_user_id || raw.sender_id || null,
    senderOrbitId: raw.sender_orbit_id || null,
    receiverOrbitId: raw.receiver_orbit_id || null,
    type,
    body: raw.body || raw.content || "",
    metadata,
    createdAt: raw.created_at || new Date().toISOString(),
    updatedAt: raw.updated_at || null,
    readAt: raw.read_at || null,
    deletedAt: raw.deleted_at || null,
    editedAt: raw.edited_at || null,
    status: resolveStatus(raw),
  };
}

/** Batch normalize */
export function normalizeMessages(rows: any[]): CanonicalMessageEnvelope[] {
  return rows.map(normalizeMessage);
}

// ── Private helpers ──

function emptyEnvelope(): CanonicalMessageEnvelope {
  return {
    id: "",
    conversationId: "",
    senderUserId: null,
    senderOrbitId: null,
    type: "text",
    body: "",
    metadata: { schemaVersion: 1 },
    createdAt: new Date().toISOString(),
  };
}

function resolveType(raw: any, meta: any): CanonicalMessageType {
  const t = raw.type || raw.message_type || "";
  const body = raw.body || raw.content || "";

  // Call detection
  if (meta?.call_event || body.match(/\[call:(ended|declined|missed):\d+\]/)) {
    const callEvent = meta?.call_event || body.match(/\[call:(ended|declined|missed):\d+\]/)?.[1];
    const isVideo = meta?.call_type === "video" || raw.is_video;
    if (callEvent === "missed") return "call_missed";
    if (callEvent === "declined") return "call_declined";
    return isVideo ? "call_video" : "call_audio";
  }

  // System
  if (t === "system" || t === "system_event" || raw.sender_id === "00000000-0000-0000-0000-000000000000") {
    return "system_notice";
  }

  // Payment
  if (t === "payment" || meta?.payment_type || meta?.event_type?.startsWith("payment_")) {
    return meta?.event_type === "payment_request" || meta?.payment_type === "request"
      ? "payment_request"
      : "payment_receipt";
  }

  // Voice
  if (t === "voice" || raw.audio_url || meta?.audio_url) return "voice";

  // Location
  if (t === "location" || meta?.lat != null) {
    return meta?.mode === "live" || meta?.is_live ? "location_live" : "location_static";
  }
  if (body.match(/openstreetmap\.org\/\?mlat=/)) return "location_static";

  // Media
  if (t === "media" || raw.attachment_url || meta?.url) {
    const url = raw.attachment_url || meta?.url || "";
    if (url.match(/\.(mp4|mov|webm|avi)/i)) return "video";
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)) return "image";
    if (url.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)/i)) return "file";
    if (meta?.media_kind === "video") return "video";
    if (meta?.media_kind === "image") return "image";
    return "image"; // default media → image
  }

  return "text";
}

function resolveStatus(raw: any): CanonicalDeliveryStatus | undefined {
  if (raw.pending || raw.status === "sending") return "sending";
  if (raw.failed || raw.status === "failed") return "failed";
  if (raw.read_at) return "read";
  if (raw.delivered_at) return "delivered";
  if (raw.id) return "sent";
  return undefined;
}

function buildCanonicalMetadata(
  type: CanonicalMessageType,
  cardType: CanonicalCardType,
  raw: any,
  legacy: any,
): CanonicalMetadata {
  const meta: CanonicalMetadata = {
    schemaVersion: 1,
    ui: {
      cardType,
      variant: "default",
      clickable: cardType !== "text" && cardType !== "system",
    },
  };

  // Transport
  if (legacy?.upload_id || legacy?.optimistic_id) {
    meta.transport = {
      optimisticId: legacy.upload_id || legacy.optimistic_id || null,
      source: "ui",
    };
  }

  // Call
  if (cardType === "call") {
    const body = raw.body || raw.content || "";
    const durationMatch = body.match(/\[call:\w+:(\d+)\]/);
    meta.call = {
      callId: legacy.call_id || null,
      mode: type === "call_video" ? "video" : "audio",
      direction: raw.sender_id === raw.sender_user_id ? "outgoing" : "incoming",
      status: type === "call_missed" ? "missed" : type === "call_declined" ? "declined" : "ended",
      peerOrbitId: legacy.peer_orbit_id || null,
      callbackEnabled: type === "call_missed",
    };
    meta.timing = {
      durationSeconds: legacy.duration_seconds || (durationMatch ? parseInt(durationMatch[1]) : null),
      startedAt: legacy.started_at || null,
      endedAt: legacy.ended_at || null,
    };
    meta.ui.primaryAction = "callback";
  }

  // Location
  if (cardType === "location") {
    meta.geo = {
      lat: legacy.lat ?? null,
      lng: legacy.lng ?? legacy.lon ?? null,
      accuracyMeters: legacy.accuracy_meters ?? null,
      address: legacy.address ?? null,
      label: legacy.label ?? null,
      liveUntil: type === "location_live" ? legacy.live_until ?? null : null,
    };
    meta.ui.primaryAction = "open_map";
  }

  // Voice / Media
  if (cardType === "voice" || cardType === "media") {
    const url = legacy.url || legacy.audio_url || raw.attachment_url || raw.audio_url || null;
    meta.media = {
      kind: type === "voice" ? "voice" : type === "video" ? "video" : type === "file" ? "file" : "image",
      url,
      mimeType: legacy.mime_type || null,
      fileName: legacy.file_name || null,
      fileSize: legacy.file_size || null,
      durationSeconds: legacy.audio_duration_seconds || legacy.duration || null,
      waveform: legacy.waveform || null,
      viewOnce: legacy.view_once || false,
      transcription: legacy.transcription || null,
      transcriptionStatus: legacy.transcript_status || "none",
    };
    meta.ui.primaryAction = "open_media";
  }

  // Payment
  if (cardType === "payment") {
    meta.payment = {
      transactionId: legacy.transaction_id || null,
      amount: legacy.amount ?? null,
      currency: legacy.currency || null,
      status: legacy.status || "pending",
      paymentType: type === "payment_request" ? "request" : "receipt",
      recipientName: legacy.recipient_name || null,
    };
    meta.ui.primaryAction = "open_payment";
  }

  // System
  if (cardType === "system") {
    meta.system = {
      eventName: legacy.event_type || null,
      eventCode: legacy.event_code || null,
    };
  }

  return meta;
}
