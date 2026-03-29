/**
 * message.capabilities — Canonical action capability matrix per message mode.
 * Determines which actions are available for each message type.
 */
import type { MessageMode } from "./message-mode";

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

const CAPABILITIES: Record<MessageMode, Partial<MessageCapabilities>> = {
  text: {
    canCopy: true, canForward: true, canReply: true,
    canDeleteSelf: true, canDeleteAll: true, canSelect: true, canShare: true,
  },
  media: {
    canForward: true, canReply: true, canDeleteSelf: true, canDeleteAll: true,
    canOpenViewer: true, canDownload: true, canSelect: true, canShare: true,
  },
  grouped_media: {
    canForward: true, canReply: true, canDeleteSelf: true, canDeleteAll: true,
    canOpenViewer: true, canDownload: true, canSelect: true, canShare: true,
  },
  voice: {
    canForward: true, canReply: true, canDeleteSelf: true, canDeleteAll: true,
    canSelect: true,
  },
  static_location: {
    canForward: true, canReply: true, canDeleteSelf: true, canDeleteAll: true,
    canOpenMap: true, canSelect: true, canShare: true,
  },
  live_location: {
    canReply: true, canDeleteSelf: true,
    canOpenMap: true, canSelect: true,
  },
  payment: {
    canReply: true, canDeleteSelf: true, canSelect: true,
  },
  system_event: {
    canDeleteSelf: true,
  },
  ephemeral: {
    canReply: true, canDeleteSelf: true, canSelect: true,
  },
  view_once: {
    canDeleteSelf: true, canOpenViewer: true,
  },
  story_reference: {
    canReply: true, canDeleteSelf: true, canSelect: true,
  },
  deleted: {},
  forwarded: {
    canCopy: true, canForward: true, canReply: true,
    canDeleteSelf: true, canDeleteAll: true, canSelect: true,
  },
};

/** Get the full capability set for a message mode */
export function getMessageCapabilities(
  mode: MessageMode,
  opts?: { isOwner?: boolean; isAdmin?: boolean },
): MessageCapabilities {
  const overrides = CAPABILITIES[mode] || {};
  const caps = { ...BASE, ...overrides };

  // Only the sender or admin can delete for all
  if (!opts?.isOwner && !opts?.isAdmin) {
    caps.canDeleteAll = false;
  }

  return caps;
}

/** Get a list of available action keys for a message */
export function getAvailableActions(
  mode: MessageMode,
  opts?: { isOwner?: boolean; isAdmin?: boolean },
): (keyof MessageCapabilities)[] {
  const caps = getMessageCapabilities(mode, opts);
  return (Object.entries(caps) as [keyof MessageCapabilities, boolean][])
    .filter(([, v]) => v)
    .map(([k]) => k);
}
