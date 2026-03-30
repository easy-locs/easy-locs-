/**
 * MessageViewModel — Canonical view model for UI consumption.
 * UI components NEVER read raw DB rows. They read this.
 * Transforms CanonicalMessageEnvelope into UI-ready data.
 */
import type { CanonicalMessageEnvelope, CanonicalCardType } from "./canonical-envelope";
import { resolveCardType } from "./canonical-envelope";

export interface MessageViewModel {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderOrbitId: string | null;
  type: string;
  cardType: CanonicalCardType;
  body: string;
  timestamp: string;
  isMine: boolean;
  isPending: boolean;
  isFailed: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  isRead: boolean;

  // UI hints
  clickable: boolean;
  primaryAction: string | null;
  variant: string;

  // Optional domain data (pre-resolved from metadata)
  media: { url: string | null; kind: string; fileName: string | null; viewOnce: boolean } | null;
  voice: { url: string | null; durationSeconds: number | null; waveform: number[] | null } | null;
  location: { lat: number | null; lng: number | null; address: string | null; isLive: boolean } | null;
  call: { mode: string; status: string; durationSeconds: number | null; callbackEnabled: boolean } | null;
  payment: { amount: number | null; currency: string | null; status: string; paymentType: string } | null;
  system: { eventName: string | null } | null;

  // Reply
  replyToMessageId: string | null;

  // Raw envelope (escape hatch — discouraged)
  _envelope: CanonicalMessageEnvelope;
}

/**
 * Convert a CanonicalMessageEnvelope to a MessageViewModel.
 */
export function toMessageViewModel(
  envelope: CanonicalMessageEnvelope,
  currentUserId: string | null,
): MessageViewModel {
  const meta = envelope.metadata || {};
  const cardType = meta.ui?.cardType || resolveCardType(envelope.type);

  return {
    id: envelope.id,
    conversationId: envelope.conversationId,
    senderId: envelope.senderUserId,
    senderOrbitId: envelope.senderOrbitId,
    type: envelope.type,
    cardType,
    body: envelope.body,
    timestamp: envelope.createdAt,
    isMine: !!currentUserId && envelope.senderUserId === currentUserId,
    isPending: envelope.status === "sending",
    isFailed: envelope.status === "failed",
    isEdited: !!envelope.editedAt,
    isDeleted: !!envelope.deletedAt,
    isRead: !!envelope.readAt,
    clickable: meta.ui?.clickable ?? false,
    primaryAction: meta.ui?.primaryAction ?? null,
    variant: meta.ui?.variant ?? "default",

    media: meta.media ? {
      url: meta.media.url ?? null,
      kind: meta.media.kind ?? "image",
      fileName: meta.media.fileName ?? null,
      viewOnce: meta.media.viewOnce ?? false,
    } : null,

    voice: (cardType === "voice" && meta.media) ? {
      url: meta.media.url ?? null,
      durationSeconds: meta.media.durationSeconds ?? null,
      waveform: meta.media.waveform ?? null,
    } : null,

    location: meta.geo ? {
      lat: meta.geo.lat ?? null,
      lng: meta.geo.lng ?? null,
      address: meta.geo.address ?? null,
      isLive: envelope.type === "location_live",
    } : null,

    call: meta.call ? {
      mode: meta.call.mode ?? "audio",
      status: meta.call.status ?? "ended",
      durationSeconds: meta.timing?.durationSeconds ?? null,
      callbackEnabled: meta.call.callbackEnabled ?? false,
    } : null,

    payment: meta.payment ? {
      amount: meta.payment.amount ?? null,
      currency: meta.payment.currency ?? null,
      status: meta.payment.status ?? "pending",
      paymentType: meta.payment.paymentType ?? "receipt",
    } : null,

    system: meta.system ? {
      eventName: meta.system.eventName ?? null,
    } : null,

    replyToMessageId: (meta.transport as any)?.replyToMessageId ?? null,
    _envelope: envelope,
  };
}

/**
 * Batch convert envelopes to view models.
 */
export function toMessageViewModels(
  envelopes: CanonicalMessageEnvelope[],
  currentUserId: string | null,
): MessageViewModel[] {
  return envelopes.map(e => toMessageViewModel(e, currentUserId));
}
