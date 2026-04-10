/**
 * Preview Engine — Instant optimistic UI (0ms perceived latency).
 * Creates ghost messages that appear immediately while transport runs in background.
 *
 * Flow: createPreview → insertPreview → emitPreview → (upload) → reconcilePreview
 */
import { platformBus } from "@/lib/shared/platform-bus";

export interface PreviewMessage {
  id: string;
  conversationId: string;
  type: string;
  preview: true;
  localUrl: string | null;
  content: string | null;
  createdAt: number;
  status: "sending" | "uploading";
  progress: number;
  version: number;
}

let previewCounter = 0;

export function createPreview(input: {
  conversationId: string;
  type: string;
  content?: string | null;
  localUrl?: string | null;
}): PreviewMessage {
  return {
    id: `tmp_${Date.now()}_${++previewCounter}`,
    conversationId: input.conversationId,
    type: input.type,
    preview: true,
    localUrl: input.localUrl || null,
    content: input.content || null,
    createdAt: Date.now(),
    status: "sending",
    progress: 0,
    version: 1,
  };
}

/**
 * Emit preview via platformBus for instant cross-component sync.
 */
export function emitPreview(msg: PreviewMessage): void {
  platformBus.emit("orbit:message_sent" as any, {
    conversationId: msg.conversationId,
    messageId: msg.id,
    preview: true,
    message: msg,
  }, "orbit");
}

/**
 * Emit progress update for upload previews.
 */
export function emitProgress(messageId: string, conversationId: string, progress: number): void {
  platformBus.emit("orbit:message_sent" as any, {
    conversationId,
    messageId,
    progress,
    type: "progress",
  }, "orbit");
}

/**
 * Emit reconciliation (preview → final server message).
 */
export function emitReconcile(
  tempId: string,
  serverId: string,
  conversationId: string,
  serverUrl?: string | null,
): void {
  platformBus.emit("orbit:message_sent" as any, {
    conversationId,
    tempId,
    serverId,
    serverUrl,
    type: "reconcile",
  }, "orbit");
}
