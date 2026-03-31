/**
 * ORBIT ENTRY REGISTRY — Grouped entry points for all Orbit actions.
 * Every user action MUST map to one of these entries.
 * No other function may perform the same action.
 */

export const OrbitEntry = {
  message: {
    sendText: "message.sendText",
    edit: "message.edit",
    delete: "message.delete",
    retry: "message.retry",
  },
  media: {
    send: "media.send",
    sendBatch: "media.sendBatch",
    retryUpload: "media.retryUpload",
    requestDownload: "media.requestDownload",
  },
  voice: {
    send: "voice.send",
    discard: "voice.discard",
  },
  location: {
    send: "location.send",
    startLive: "location.startLive",
    stopLive: "location.stopLive",
  },
  receipt: {
    markRead: "receipt.markRead",
    markSingleRead: "receipt.markSingleRead",
    clearMarkedUnread: "receipt.clearMarkedUnread",
  },
  conversation: {
    openDirect: "conversation.openDirect",
    createGroup: "conversation.createGroup",
    updateGroup: "conversation.updateGroup",
  },
  call: {
    startAudio: "call.startAudio",
    startVideo: "call.startVideo",
    accept: "call.accept",
    decline: "call.decline",
    end: "call.end",
  },
  draft: {
    save: "draft.save",
    clear: "draft.clear",
    restore: "draft.restore",
  },
  search: {
    conversations: "search.conversations",
    messages: "search.messages",
  },
  presence: {
    update: "presence.update",
    typing: "presence.typing",
  },
} as const;

/** Flat union of all entry keys */
type EntryValues<T> = T extends Record<string, infer V> ? V : never;
export type OrbitEntryKey = EntryValues<typeof OrbitEntry[keyof typeof OrbitEntry]>;
