/**
 * buildMetadata — Canonical metadata builders for each send pipeline.
 * Used by send-text, send-voice, send-location, send-payment, send-system-event, send-media-optimistic.
 * Ensures every new message is written with schemaVersion: 1 canonical metadata.
 */
import type {
  CanonicalMetadata,
  CanonicalCardType,
  CanonicalMessageType,
} from "./canonical-envelope";
import { resolveCardType } from "./canonical-envelope";

/** Build canonical metadata for a text message */
export function buildTextMeta(opts?: {
  encrypted?: boolean;
  category?: string;
  locale?: string;
  replyToId?: string | null;
}): CanonicalMetadata {
  return {
    schemaVersion: 1,
    ui: { cardType: "text", variant: "default" },
    transport: { source: "ui" },
  };
}

/** Build canonical metadata for a voice message */
export function buildVoiceMeta(audioUrl: string, durationSeconds: number): CanonicalMetadata {
  return {
    schemaVersion: 1,
    ui: { cardType: "voice", clickable: true, primaryAction: "open_media" },
    media: {
      kind: "voice",
      url: audioUrl,
      durationSeconds,
      transcriptionStatus: "pending",
    },
    transport: { source: "ui" },
  };
}

/** Build canonical metadata for a location message */
export function buildLocationMeta(
  lat: number,
  lng: number,
  mode: "static" | "live",
  opts?: { label?: string; address?: string; duration?: number },
): CanonicalMetadata {
  return {
    schemaVersion: 1,
    ui: { cardType: "location", variant: "info", clickable: true, primaryAction: "open_map" },
    geo: {
      lat,
      lng,
      label: opts?.label || null,
      address: opts?.address || null,
      liveUntil: mode === "live" && opts?.duration
        ? new Date(Date.now() + opts.duration * 60000).toISOString()
        : null,
    },
    transport: { source: "ui" },
  };
}

/** Build canonical metadata for media (image/video/file) */
export function buildMediaMeta(
  mediaKind: "image" | "video" | "file",
  opts: {
    url: string;
    mimeType?: string;
    fileName?: string;
    fileSize?: number;
    duration?: number;
    thumbnailUrl?: string;
    viewOnce?: boolean;
    uploadId?: string;
    uploadStatus?: string;
  },
): CanonicalMetadata {
  return {
    schemaVersion: 1,
    ui: {
      cardType: "media",
      clickable: true,
      primaryAction: "open_media",
    },
    media: {
      kind: mediaKind,
      url: opts.url,
      mimeType: opts.mimeType || null,
      fileName: opts.fileName || null,
      fileSize: opts.fileSize || null,
      durationSeconds: opts.duration || null,
      viewOnce: opts.viewOnce || false,
    },
    transport: {
      source: "ui",
      optimisticId: opts.uploadId || null,
    },
  };
}

/** Build canonical metadata for a payment message */
export function buildPaymentMeta(
  paymentType: "request" | "receipt",
  amount: number,
  currency: string,
  opts?: { transactionId?: string; status?: string; description?: string },
): CanonicalMetadata {
  return {
    schemaVersion: 1,
    ui: { cardType: "payment", clickable: true, primaryAction: "open_payment" },
    payment: {
      paymentType,
      amount,
      currency,
      transactionId: opts?.transactionId || null,
      status: (opts?.status as any) || "pending",
      recipientName: opts?.description || null,
    },
    transport: { source: "ui" },
  };
}

/** Build canonical metadata for a system event */
export function buildSystemMeta(eventName: string, extra?: Record<string, any>): CanonicalMetadata {
  return {
    schemaVersion: 1,
    ui: { cardType: "system", variant: "info" },
    system: { eventName, eventCode: extra?.event_code || null },
    transport: { source: "system" },
  };
}

/** Build canonical metadata for a call event */
export function buildCallMeta(
  mode: "audio" | "video",
  status: "ended" | "missed" | "declined",
  opts?: {
    callId?: string;
    direction?: "incoming" | "outgoing";
    durationSeconds?: number;
    peerOrbitId?: string;
    startedAt?: string;
    endedAt?: string;
  },
): CanonicalMetadata {
  const callType: CanonicalMessageType =
    status === "missed" ? "call_missed"
    : status === "declined" ? "call_declined"
    : mode === "video" ? "call_video" : "call_audio";

  return {
    schemaVersion: 1,
    ui: {
      cardType: "call",
      variant: status === "missed" ? "danger" : status === "declined" ? "warning" : "default",
      clickable: true,
      primaryAction: "callback",
    },
    call: {
      callId: opts?.callId || null,
      mode,
      direction: opts?.direction || "outgoing",
      status,
      peerOrbitId: opts?.peerOrbitId || null,
      callbackEnabled: status === "missed",
    },
    timing: {
      durationSeconds: opts?.durationSeconds || null,
      startedAt: opts?.startedAt || null,
      endedAt: opts?.endedAt || null,
    },
    transport: { source: "system" },
  };
}
