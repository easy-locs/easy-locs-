/**
 * Orbit Domain Service — Use-case implementations.
 */
import type { OrbitUseCases, SendMessageCommand, StartCallCommand } from "./ports";
import { conversationAdapter, messageAdapter, callAdapter, profileAdapter, encryptionAdapter } from "./adapters/supabase.adapter";
import { orbitEvents } from "./events";
import { createDomainLogger } from "../shared/observability";
import { requireAuth, type SecurityContext } from "../shared/security-guards";

const log = createDomainLogger("orbit");

export function createOrbitService(ctx: SecurityContext | null): OrbitUseCases {
  return {
    async sendMessage(cmd: SendMessageCommand) {
      requireAuth(ctx);
      const timer = log.timed("send_message", { conversationId: cmd.conversationId });

      try {
        let body = cmd.body;
        if (cmd.encrypted) {
          body = await encryptionAdapter.encrypt(body, cmd.conversationId);
        }

        const message = {
          id: crypto.randomUUID(),
          conversationId: cmd.conversationId,
          senderId: cmd.senderId,
          body,
          encrypted: cmd.encrypted ?? false,
          mediaUrl: cmd.mediaUrl,
          readBy: [],
          createdAt: new Date().toISOString(),
        };

        await messageAdapter.save(message);
        orbitEvents.messageSent(message);
        timer.done();
        return { ok: true as const, data: message };
      } catch (err) {
        timer.fail(err);
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getConversation(id: string) {
      requireAuth(ctx);
      try {
        const conv = await conversationAdapter.findById(id);
        if (!conv) return { ok: false as const, error: "Conversation not found" };
        return { ok: true as const, data: conv };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async listConversations(userId: string) {
      requireAuth(ctx);
      try {
        const convs = await conversationAdapter.findByParticipant(userId);
        return { ok: true as const, data: convs };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async startCall(cmd: StartCallCommand) {
      requireAuth(ctx);
      const timer = log.timed("start_call", { callerId: cmd.callerId });

      try {
        const session = {
          id: crypto.randomUUID(),
          callerId: cmd.callerId,
          calleeId: cmd.calleeId,
          isVideo: cmd.isVideo,
          status: "ringing" as const,
          startedAt: new Date().toISOString(),
        };

        await callAdapter.save(session);
        orbitEvents.callStarted(session);
        timer.done();
        return { ok: true as const, data: session };
      } catch (err) {
        timer.fail(err);
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async endCall(callId: string, status: "ended" | "missed") {
      requireAuth(ctx);
      try {
        await callAdapter.updateStatus(callId, status);
        const session = await callAdapter.findById(callId);
        if (session) orbitEvents.callEnded(session);
        log.info("call_ended", { callId, status });
        return { ok: true as const, data: undefined };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getProfile(userId: string) {
      requireAuth(ctx);
      try {
        const profile = await profileAdapter.findByUserId(userId);
        if (!profile) return { ok: false as const, error: "Profile not found" };
        return { ok: true as const, data: profile };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
