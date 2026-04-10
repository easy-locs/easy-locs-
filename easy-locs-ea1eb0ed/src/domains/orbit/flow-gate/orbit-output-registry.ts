/**
 * ORBIT OUTPUT REGISTRY — Grouped output events for all Orbit mutations.
 * UI subscribes to these. UI never writes directly.
 */

export const OrbitOutput = {
  message: {
    inserted: "message_inserted",
    updated: "message_updated",
    deleted: "message_deleted",
    failed: "message_failed",
    reconciled: "message_reconciled",
  },
  attachment: {
    created: "attachment_created",
    uploaded: "attachment_uploaded",
    downloadReady: "attachment_download_ready",
    failed: "attachment_failed",
  },
  receipt: {
    read: "conversation_read",
    delivered: "message_delivered",
  },
  conversation: {
    created: "conversation_created",
    updated: "conversation_updated",
    merged: "conversation_merged",
  },
  call: {
    started: "call_started",
    incoming: "call_incoming",
    accepted: "call_accepted",
    declined: "call_declined",
    ended: "call_ended",
    failed: "call_failed",
  },
  draft: {
    saved: "draft_saved",
    cleared: "draft_cleared",
  },
} as const;

type OutputValues<T> = T extends Record<string, infer V> ? V : never;
export type OrbitOutputType = OutputValues<typeof OrbitOutput[keyof typeof OrbitOutput]>;

// ── Listener system ──

type OutputCallback = (payload: unknown) => void;
const listeners = new Map<string, OutputCallback[]>();

/** Emit an output event. Only pipelines may call this. */
export function emitOutput(type: string, payload: unknown): void {
  if (__DEV__) {
    console.debug("[ORBIT OUTPUT]", type, payload);
  }
  const subs = listeners.get(type);
  if (subs) {
    for (const cb of subs) {
      try { cb(payload); } catch { /* swallow listener errors */ }
    }
  }
}

/** Subscribe to output events. Returns unsubscribe function. */
export function onOutput(type: string, cb: OutputCallback): () => void {
  const subs = listeners.get(type) || [];
  subs.push(cb);
  listeners.set(type, subs);
  return () => {
    const arr = listeners.get(type);
    if (arr) {
      const idx = arr.indexOf(cb);
      if (idx >= 0) arr.splice(idx, 1);
    }
  };
}

const __DEV__ = typeof process !== "undefined"
  ? process.env.NODE_ENV !== "production"
  : true;
