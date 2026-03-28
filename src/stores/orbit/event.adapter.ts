/**
 * orbit.event.adapter — Canonical event emission for Orbit domain.
 * Bridges Orbit actions → platformBus with typed payloads.
 * Zero state. Zero DB. Pure event wiring.
 */
import { platformBus } from "@/lib/shared/platform-bus";

export function emitThreadCreated(threadId: string, threadType: string) {
  platformBus.emit("orbit:thread_created", { threadId, threadType }, "orbit");
}

export function emitMessageSent(conversationId: string, messageId: string, preview: string) {
  platformBus.emit("orbit:message_sent", {
    conversationId,
    messageId,
    contentPreview: preview,
  }, "orbit");
}

export function emitCallStarted(callId: string, isVideo: boolean, peerName?: string) {
  platformBus.emit("call:started", { callId, role: "caller", isVideo, peerName }, "orbit");
}

export function emitCallEnded(callId: string, status: string) {
  platformBus.emit("call:ended", { callId, status }, "orbit");
}

export function emitProfileLoaded(orbitId: string, userId: string) {
  platformBus.emit("orbit:profile_loaded", { orbitId, userId }, "orbit");
}
