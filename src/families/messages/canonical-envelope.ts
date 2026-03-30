/**
 * CanonicalMessageEnvelope — Single source of truth for all message types.
 * Every message in Orbit MUST conform to this structure.
 * No logic may rely on body parsing when metadata carries the data.
 */

// ── Canonical message type taxonomy ──
export type CanonicalMessageType =
  | "text"
  | "image"
  | "video"
  | "voice"
  | "audio"
  | "file"
  | "location_static"
  | "location_live"
  | "call_audio"
  | "call_video"
  | "call_missed"
  | "call_declined"
  | "payment_request"
  | "payment_receipt"
  | "system_notice";

export type CanonicalCardType =
  | "text"
  | "media"
  | "voice"
  | "location"
  | "call"
  | "payment"
  | "system";

export type CanonicalDeliveryStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

// ── Metadata sub-blocks ──

export interface CanonicalEntityRef {
  id?: string | null;
  type?: string | null;
  label?: string | null;
}

export interface CanonicalUIHint {
  cardType?: CanonicalCardType;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  clickable?: boolean;
  primaryAction?: "callback" | "open_map" | "open_payment" | "open_media";
}

export interface CanonicalTransport {
  optimisticId?: string | null;
  source?: "ui" | "system" | "rpc" | "migration";
  dedupeKey?: string | null;
  flowId?: string | null;
}

export interface CanonicalPreview {
  title?: string | null;
  subtitle?: string | null;
  thumbnailUrl?: string | null;
  summary?: string | null;
}

export interface CanonicalTiming {
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  localTime?: string | null;
  timezone?: string | null;
}

export interface CanonicalGeo {
  lat?: number | null;
  lng?: number | null;
  accuracyMeters?: number | null;
  address?: string | null;
  label?: string | null;
  liveUntil?: string | null;
}

export interface CanonicalMediaMeta {
  kind?: "image" | "video" | "voice" | "audio" | "file";
  url?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  waveform?: number[] | null;
  viewOnce?: boolean;
  transcription?: string | null;
  transcriptionStatus?: "none" | "pending" | "done" | "failed";
}

export interface CanonicalCallMeta {
  callId?: string | null;
  mode?: "audio" | "video";
  direction?: "incoming" | "outgoing";
  status?: "initiated" | "ringing" | "answered" | "missed" | "declined" | "ended" | "failed";
  peerUserId?: string | null;
  peerOrbitId?: string | null;
  callbackEnabled?: boolean;
}

export interface CanonicalPaymentMeta {
  transactionId?: string | null;
  requestId?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: "initiated" | "pending" | "completed" | "failed" | "cancelled" | "refunded";
  paymentType?: "request" | "receipt";
  recipientName?: string | null;
}

export interface CanonicalWeather {
  condition?: string | null;
  temperatureC?: number | null;
  windKph?: number | null;
  observedAt?: string | null;
}

export interface CanonicalSystemMeta {
  eventName?: string | null;
  eventCode?: string | null;
}

// ── Full metadata ──

export interface CanonicalMetadata {
  schemaVersion: 1;
  entity?: CanonicalEntityRef;
  ui?: CanonicalUIHint;
  transport?: CanonicalTransport;
  preview?: CanonicalPreview;
  timing?: CanonicalTiming;
  geo?: CanonicalGeo;
  media?: CanonicalMediaMeta;
  call?: CanonicalCallMeta;
  payment?: CanonicalPaymentMeta;
  weather?: CanonicalWeather;
  system?: CanonicalSystemMeta;
}

// ── Full envelope ──

export interface CanonicalMessageEnvelope {
  id: string;
  conversationId: string;
  senderUserId: string | null;
  senderOrbitId: string | null;
  receiverOrbitId?: string | null;
  type: CanonicalMessageType;
  body: string;
  metadata: CanonicalMetadata;
  createdAt: string;
  updatedAt?: string | null;
  readAt?: string | null;
  deletedAt?: string | null;
  editedAt?: string | null;
  status?: CanonicalDeliveryStatus;
}

// ── Card type resolution ──

const TYPE_TO_CARD: Record<CanonicalMessageType, CanonicalCardType> = {
  text: "text",
  image: "media",
  video: "media",
  voice: "voice",
  audio: "voice",
  file: "media",
  location_static: "location",
  location_live: "location",
  call_audio: "call",
  call_video: "call",
  call_missed: "call",
  call_declined: "call",
  payment_request: "payment",
  payment_receipt: "payment",
  system_notice: "system",
};

export function resolveCardType(type: CanonicalMessageType): CanonicalCardType {
  return TYPE_TO_CARD[type] || "text";
}
