/**
 * message.capabilities — Canonical action capability matrix per message type.
 */
import type { CanonicalMessageType } from "./canonical-envelope";

export interface MessageCapabilities {
  canCopy: boolean;
  canForward: boolean;
  canReply: boolean;
  canDeleteSelf: boolean;
  canDeleteAll: boolean;
  canOpenViewer: boolean;
  canOpenMap: boolean;
  canDownload: boolean;
  canShare: boolean;
  canSelect: boolean;
}

const BASE: MessageCapabilities = {
  canCopy: false,
  canForward: false,
  canReply: false,
  canDeleteSelf: false,
  canDeleteAll: false,
  canOpenViewer: false,
  canOpenMap: false,
  canDownload: false,
  canShare: false,
  canSelect: false,
};

const CAPABILITIES: Record<CanonicalMessageType, Partial<MessageCapabilities>> = {
  text: {
    canCopy: true, canForward: true, canReply: true,
    canDeleteSelf: true, canDeleteAll: true, canSelect: true, canShare: true,
  },
  image: {
    canForward: true, canReply: true, canDeleteSelf: true, canDeleteAll: true,
    canOpenViewer: true, canDownload: true, canSelect: true, canShare: true,
  },
  video: {
    canForward: true, canReply: true, canDeleteSelf: true, canDeleteAll: true,
    canOpenViewer: true, canDownload: true, canSelect: true, canShare: true,
  },
  voice: {
    canForward: true, canReply: true, canDeleteSelf: true, canDeleteAll: true,
    canSelect: true,
  },
  audio: {
    canForward: true, canReply: true, canDeleteSelf: true, canDeleteAll: true,
    canSelect: true, canDownload: true,
  },
  file: {
    canForward: true, canReply: true, canDeleteSelf: true, canDeleteAll: true,
    canDownload: true, canSelect: true, canShare: true,
  },
  location_static: {
    canForward: true, canReply: true, canDeleteSelf: true, canDeleteAll: true,
    canOpenMap: true, canSelect: true, canShare: true,
  },
  location_live: {
    canReply: true, canDeleteSelf: true,
    canOpenMap: true, canSelect: true,
  },
  call_audio: { canReply: true, canDeleteSelf: true, canSelect: true },
  call_video: { canReply: true, canDeleteSelf: true, canSelect: true },
  call_missed: { canReply: true, canDeleteSelf: true, canSelect: true },
  call_declined: { canReply: true, canDeleteSelf: true, canSelect: true },
  payment_request: { canReply: true, canDeleteSelf: true, canSelect: true },
  payment_receipt: { canReply: true, canDeleteSelf: true, canSelect: true },
  system_notice: { canDeleteSelf: true },
};

/** Get the full capability set for a message type */
export function getMessageCapabilities(
  mode: CanonicalMessageType | string,
  opts?: { isOwner?: boolean; isAdmin?: boolean },
): MessageCapabilities {
  const overrides = CAPABILITIES[mode as CanonicalMessageType] || {};
  const caps = { ...BASE, ...overrides };

  if (!opts?.isOwner && !opts?.isAdmin) {
    caps.canDeleteAll = false;
  }

  return caps;
}

/** Get a list of available action keys for a message */
export function getAvailableActions(
  mode: CanonicalMessageType | string,
  opts?: { isOwner?: boolean; isAdmin?: boolean },
): (keyof MessageCapabilities)[] {
  const caps = getMessageCapabilities(mode, opts);
  return (Object.entries(caps) as [keyof MessageCapabilities, boolean][])
    .filter(([, v]) => v)
    .map(([k]) => k);
}
