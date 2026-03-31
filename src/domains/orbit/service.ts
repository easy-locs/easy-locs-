/**
 * Orbit Domain Service — Use-case implementations.
 * ALL write-paths are guarded with idempotency + single-path enforcement.
 */
import type { OrbitUseCases, SendMessageCommand, StartCallCommand } from "./ports";
import { conversationAdapter, messageAdapter, callAdapter, profileAdapter, encryptionAdapter } from "./adapters/supabase.adapter";
import { orbitEvents } from "./events";
import { createDomainLogger } from "../shared/observability";
import { requireAuth, type SecurityContext } from "../shared/security-guards";
import { createActionGuard, acquireSinglePath } from "@/lib/guards/action-guard";

const log = createDomainLogger("orbit");

// ── Guards (module-level singletons) ──
const sendMessageGuard = createActionGuard("orbit.message.send");
const startCallGuard = createActionGuard("orbit.call.start");
const endCallGuard = createActionGuard("orbit.call.end");

export function createOrbitService(ctx: SecurityContext | null): OrbitUseCases {
  return {
    async sendMessage(cmd: SendMessageCommand) {
      requireAuth(ctx);

      // Single-path: prevent concurrent sends of the same message
      const clientMsgId = (cmd as any).clientMessageId ?? cmd.body.slice(0, 20);
      const flowKey = `orbit.message.send:${cmd.conversationId}:${clientMsgId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) {
        return { ok: false as const, error: "message_already_sending" };
      }

      try {
        const result = await sendMessageGuard.execute(
          async (actionCtx) => {
            const timer = log.timed("send_message", {
              conversationId: cmd.conversationId,
              correlationId: actionCtx.correlationId,
            });

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
              return message;
            } catch (err) {
              timer.fail(err);
              throw err;
            }
          },
          {
            requestId: (cmd as any).requestId,
            correlationId: (cmd as any).correlationId,
            metadata: {
              conversationId: cmd.conversationId,
              senderId: cmd.senderId,
            },
          }
        );

        if (result.deduplicated) {
          return { ok: true as const, data: result.data! };
        }
        if (!result.ok) {
          return { ok: false as const, error: result.error ?? "Unknown error" };
        }
        return { ok: true as const, data: result.data! };
      } finally {
        release();
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

      // Single-path: prevent concurrent call starts on the same conversation
      const flowKey = `orbit.call.start:${cmd.callerId}:${cmd.calleeId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) {
        return { ok: false as const, error: "call_already_starting" };
      }

      try {
        const result = await startCallGuard.execute(
          async (actionCtx) => {
            const timer = log.timed("start_call", {
              callerId: cmd.callerId,
              correlationId: actionCtx.correlationId,
            });

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
              return session;
            } catch (err) {
              timer.fail(err);
              throw err;
            }
          },
          {
            requestId: (cmd as any).requestId,
            metadata: { callerId: cmd.callerId, calleeId: cmd.calleeId },
          }
        );

        if (!result.ok) {
          return { ok: false as const, error: result.error ?? "Unknown error" };
        }
        return { ok: true as const, data: result.data! };
      } finally {
        release();
      }
    },

    async endCall(callId: string, status: "ended" | "missed") {
      requireAuth(ctx);

      // Single-path: prevent double hangup
      const flowKey = `orbit.call.end:${callId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) {
        return { ok: true as const, data: undefined }; // idempotent — already ending
      }

      try {
        const result = await endCallGuard.execute(
          async (actionCtx) => {
            await callAdapter.updateStatus(callId, status);
            const session = await callAdapter.findById(callId);
            if (session) orbitEvents.callEnded(session);
            log.info("call_ended", {
              callId,
              status,
              correlationId: actionCtx.correlationId,
            });
          },
          {
            requestId: `end_${callId}_${status}`,
            metadata: { callId, status },
          }
        );

        if (!result.ok) {
          return { ok: false as const, error: result.error ?? "Unknown error" };
        }
        return { ok: true as const, data: undefined };
      } finally {
        release();
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
