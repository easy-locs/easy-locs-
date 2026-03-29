/**
 * Orbit Domain — Event adapter.
 */
import { publishDomainEvent, createDomainEvent } from "../shared/domain-event-bus";
import type { OrbitEventPort, Message, CallSession } from "./ports";

export const orbitEvents: OrbitEventPort = {
  messageSent(message: Message) {
    publishDomainEvent(
      createDomainEvent("orbit:message_sent", message.id, "message", {
        conversationId: message.conversationId,
        messageId: message.id,
        contentPreview: message.body.slice(0, 80),
      }, "orbit")
    );
  },

  callStarted(session: CallSession) {
    publishDomainEvent(
      createDomainEvent("call:started", session.id, "call_session", {
        callId: session.id, callerId: session.callerId,
        calleeId: session.calleeId, isVideo: session.isVideo,
      }, "orbit")
    );
  },

  callEnded(session: CallSession) {
    publishDomainEvent(
      createDomainEvent("call:ended", session.id, "call_session", {
        callId: session.id, status: session.status,
      }, "orbit")
    );
  },

  presenceChanged(userId: string, online: boolean) {
    publishDomainEvent(
      createDomainEvent("orbit:presence_changed", userId, "orbit_profile", {
        userId, online,
      }, "orbit")
    );
  },
};
