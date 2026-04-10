/**
 * OrbitDispatch — Canonical Action Pipeline.
 * Single entry point for ALL Orbit user actions.
 *
 * FLOW GATE INTEGRATED:
 *   UI → useOrbitDispatch → orbitDispatch → executeFlow(entryKey) → executor → guardedWrite → owner → output
 *
 * Responsibilities:
 * 1. Map command type → EntryKey
 * 2. Idempotency guard (send-locks)
 * 3. Flow gate lock (executeFlow — prevents double-tap at domain level)
 * 4. Resolve identity context (ONCE)
 * 5. Delegate to typed executor
 * 6. Release locks
 *
 * This dispatcher does NOT contain business logic.
 * All logic lives in the executor layer (src/families/orbit-dispatch/pipeline/).
 */
import type { OrbitCommand, OrbitCommandResult } from "./orbit-commands";
import { getOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { supabase } from "@/integrations/supabase/client";
import type { ResolvedContext } from "./pipeline/pipeline-types";
import { checkIdempotencyGuard, issueRequestId, registerInflightRequest, releaseInflightRequest } from "./send-locks";
import {
  executeFlow,
  withFlowGate,
  FlowGateError,
  type EntryKey,
} from "@/domains/orbit/flow-gate";
import { enqueue, createFlowId } from "@/domains/orbit/stream/flow-core";
import { offlineQueue } from "@/domains/orbit/stream/offline-queue";

// ── Executors ──
import { executeSendText } from "./pipeline/executeSendText";
import { executeSendMedia } from "./pipeline/executeSendMedia";
import { executeSendMediaBatch } from "./pipeline/executeSendMediaBatch";
import { executeSendVoice } from "./pipeline/executeSendVoice";
import { executeSendLocation } from "./pipeline/executeSendLocation";
import { executeStartCall } from "./pipeline/executeStartCall";
import { executeAcceptCall } from "./pipeline/executeAcceptCall";
import { executeDeclineCall } from "./pipeline/executeDeclineCall";
import { executeEndCall } from "./pipeline/executeEndCall";
import { executeEditMessage } from "./pipeline/executeEditMessage";
import { executeReplyMessage } from "./pipeline/executeReplyMessage";
import { executeRetryMessage } from "./pipeline/executeRetryMessage";

// ── Command type → EntryKey mapping ──
const COMMAND_TO_ENTRY: Record<string, EntryKey> = {
  send_text: "message.sendText",
  reply: "message.sendText", // reply reuses text pipeline
  send_media: "media.send",
  send_media_batch: "media.sendBatch",
  send_voice: "voice.send",
  send_location: "location.send",
  start_call: "call.startAudio", // resolved below based on mode
  accept_call: "call.accept",
  decline_call: "call.decline",
  end_call: "call.end",
  edit_message: "message.edit",
  retry_message: "message.retry",
  group_create: "conversation.createGroup",
  group_update: "conversation.updateGroup",
  presence_update: "presence.update",
  typing_update: "presence.typing",
};

function resolveEntryKey(cmd: OrbitCommand): EntryKey {
  if (cmd.type === "start_call") {
    return cmd.mode === "video" ? "call.startVideo" : "call.startAudio";
  }
  return COMMAND_TO_ENTRY[cmd.type] || ("message.sendText" as EntryKey);
}

// ── Cached session resolver (avoid getSession() on every dispatch) ──
let _cachedUserId: string | null = null;
let _cacheExpiry = 0;
const CACHE_TTL = 30_000; // 30s

async function resolveCurrentUserIdFromSession(): Promise<string> {
  const now = Date.now();
  if (_cachedUserId && now < _cacheExpiry) return _cachedUserId;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  _cachedUserId = userId;
  _cacheExpiry = now + CACHE_TTL;
  return userId;
}

// Clear cache on auth state change
supabase.auth.onAuthStateChange(() => {
  _cachedUserId = null;
  _cacheExpiry = 0;
});

// ── Context resolution (ONCE per dispatch) ──
function resolveContext(conversationId: string): ResolvedContext | Promise<ResolvedContext> {
  const orbit = getOrbitIdentity();
  // Fast path: identity already available (no await needed)
  if (orbit?.userId) {
    return {
      conversationId,
      senderUserId: orbit.userId,
      senderOrbitId: orbit.orbitId || `orbit_${orbit.userId.replace(/-/g, "").substring(0, 8)}`,
      receiverOrbitId: null,
      orgId: null,
    };
  }
  // Slow path: resolve from session (cached)
  return resolveCurrentUserIdFromSession().then(userId => ({
    conversationId,
    senderUserId: userId,
    senderOrbitId: `orbit_${userId.replace(/-/g, "").substring(0, 8)}`,
    receiverOrbitId: null,
    orgId: null,
  }));
}

/**
 * orbitDispatch — Execute a canonical Orbit command.
 * This is the ONLY function the UI layer should call for actions.
 *
 * FLOW: idempotency → serial queue (per conversation) → flow gate → executor → result
 * OFFLINE: if offline, queue for later auto-flush.
 */
export async function orbitDispatch(cmd: OrbitCommand): Promise<OrbitCommandResult> {
  if (!cmd?.type) return { ok: false, error: "no_command_type" };

  if (!checkIdempotencyGuard(cmd)) {
    if (import.meta.env.DEV) {
      console.warn(`[orbitDispatch] Duplicate command blocked: ${cmd.type}`);
    }
    return { ok: false, error: "duplicate_command" };
  }

  const requestId = issueRequestId();
  registerInflightRequest(requestId, cmd);
  const entryKey = resolveEntryKey(cmd);

  // ── Resolve conversation key for serial queue ──
  const queueKey = (cmd as any).conversationId || "global";
  const flowId = createFlowId(entryKey, queueKey);

  try {
    // ═══ OFFLINE GATE: if offline, queue write commands for later ═══
    const isWriteCmd = ["send_text", "send_media", "send_media_batch", "send_voice", "send_location", "edit_message", "reply"].includes(cmd.type);
    if (isWriteCmd && typeof navigator !== "undefined" && !navigator.onLine) {
      offlineQueue.enqueue(cmd.type, cmd);
      return { ok: true, error: "queued_offline", requestId };
    }

    // ═══ SERIAL QUEUE: 1 conversation = 1 serial pipeline ═══
    const result = await enqueue(queueKey, async () => {
      // ═══ FLOW GATE: every command passes through executeFlow ═══
      return executeFlow(entryKey, async (flowCtx) => {
        if (import.meta.env.DEV) {
          console.debug(`[orbitDispatch] ${cmd.type} → ${flowCtx.entry} [flow:${flowId}]`);
        }

        switch (cmd.type) {
          case "send_text": {
            const ctx = await resolveContext(cmd.conversationId);
            return { ...await executeSendText(ctx, cmd), requestId };
          }
          case "send_media": {
            const ctx = await resolveContext(cmd.conversationId);
            return { ...await executeSendMedia(ctx, cmd), requestId };
          }
          case "send_media_batch": {
            const ctx = await resolveContext(cmd.conversationId);
            return { ...await executeSendMediaBatch(ctx, cmd), requestId };
          }
          case "send_voice": {
            const ctx = await resolveContext(cmd.conversationId);
            return { ...await executeSendVoice(ctx, cmd), requestId };
          }
          case "send_location": {
            const ctx = await resolveContext(cmd.conversationId);
            return { ...await executeSendLocation(ctx, cmd), requestId };
          }
          case "start_call": {
            const ctx = await resolveContext(cmd.conversationId || "");
            return { ...await executeStartCall(ctx, cmd), requestId };
          }
          case "accept_call":
            return { ...await executeAcceptCall(cmd), requestId };
          case "decline_call":
            return { ...await executeDeclineCall(cmd), requestId };
          case "end_call":
            return { ...await executeEndCall(cmd), requestId };
          case "edit_message":
            return { ...await executeEditMessage(cmd), requestId };
          case "retry_message":
            return { ...await executeRetryMessage(cmd), requestId };
          case "reply": {
            const ctx = await resolveContext(cmd.conversationId);
            return { ...await executeReplyMessage(ctx, cmd), requestId };
          }
          case "group_create": {
            const { GroupCreate } = await import("@/families/groups/group-create");
            const orbit = getOrbitIdentity();
            const userId = orbit?.userId || await resolveCurrentUserIdFromSession();
            const result = await GroupCreate.execute({
              title: cmd.title,
              memberIds: cmd.memberUserIds,
              avatarUrl: cmd.avatarUrl || undefined,
              createdByUserId: userId,
              createdByOrbitId: orbit?.orbitId,
            });
            return { ok: !!result, groupId: result?.id, requestId };
          }
          case "group_update": {
            const { updateOrbitGroup } = await import("@/families/groups/group-update");
            await updateOrbitGroup(cmd);
            return { ok: true, requestId };
          }
          case "presence_update": {
            const { PresencePipeline } = await import("@/families/presence");
            const orbit = getOrbitIdentity();
            if (orbit?.userId) PresencePipeline.sendPresence(orbit.userId, cmd.status);
            return { ok: true, requestId };
          }
          case "typing_update": {
            const { PresencePipeline } = await import("@/families/presence");
            const orbit = getOrbitIdentity();
            if (orbit?.userId) PresencePipeline.sendTyping(cmd.conversationId, orbit.userId, orbit.displayName || "", cmd.activity);
            return { ok: true, requestId };
          }
          default:
            return { ok: false, error: `Unknown command type: ${(cmd as any).type}`, requestId };
        }
      });
    });

    return result;
  } catch (err: any) {
    // FlowGateError means duplicate flow was blocked — not a real error
    if (err instanceof FlowGateError && err.code === "duplicate_flow") {
      if (import.meta.env.DEV) {
        console.warn(`[orbitDispatch] Flow gate blocked duplicate: ${cmd.type}`);
      }
      return { ok: false, error: "flow_gate_blocked", requestId };
    }
    console.error(`[orbitDispatch] ${cmd.type} failed:`, err);
    return { ok: false, error: err?.message || "Command failed", requestId };
  } finally {
    releaseInflightRequest(requestId);
  }
}
