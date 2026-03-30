/**
 * OrbitDispatch — Canonical Action Pipeline.
 * Single entry point for ALL Orbit user actions.
 *
 * Responsibilities:
 * 1. Validate command type
 * 2. Idempotency guard
 * 3. Resolve identity context (ONCE)
 * 4. Delegate to typed executor (intent→canonical→optimistic→transport→reconcile)
 *
 * This dispatcher does NOT contain business logic.
 * All logic lives in the executor layer (src/families/orbit-dispatch/pipeline/).
 */
import type { OrbitCommand, OrbitCommandResult } from "./orbit-commands";
import { getCurrentUserId } from "@/families/identity";
import { getOrbitIdentity } from "@/hooks/useOrbitIdentity";
import type { ResolvedContext } from "./pipeline/pipeline-types";

// ── Executors ──
import { executeSendText } from "./pipeline/executeSendText";
import { executeSendMedia } from "./pipeline/executeSendMedia";
import { executeSendVoice } from "./pipeline/executeSendVoice";
import { executeSendLocation } from "./pipeline/executeSendLocation";
import { executeStartCall } from "./pipeline/executeStartCall";
import { executeEndCall } from "./pipeline/executeEndCall";
import { executeEditMessage } from "./pipeline/executeEditMessage";
import { executeReplyMessage } from "./pipeline/executeReplyMessage";

// ── Idempotency ──
const recentKeys = new Set<string>();
const IDEMPOTENCY_TTL = 5_000;

function idempotencyKey(cmd: OrbitCommand): string {
  switch (cmd.type) {
    case "send_text":
    case "reply":
      return `${cmd.type}:${cmd.conversationId}:${(cmd as any).body?.slice(0, 60)}:${Math.floor(Date.now() / 1000)}`;
    case "send_media":
      return `send_media:${cmd.conversationId}:${cmd.file.name}:${cmd.file.size}`;
    case "send_voice":
      return `send_voice:${cmd.conversationId}:${cmd.durationSeconds}:${Date.now()}`;
    case "send_location":
      return `send_location:${cmd.conversationId}:${cmd.lat}:${cmd.lng}`;
    case "start_call":
      return `start_call:${cmd.peerUserId}:${cmd.mode}`;
    case "accept_call":
      return `accept_call:${cmd.sessionId}`;
    case "end_call":
      return `end_call:${cmd.sessionId}`;
    case "edit_message":
      return `edit_message:${cmd.messageId}:${Date.now()}`;
  }
}

function checkIdempotency(key: string): boolean {
  if (recentKeys.has(key)) return false;
  recentKeys.add(key);
  setTimeout(() => recentKeys.delete(key), IDEMPOTENCY_TTL);
  return true;
}

// ── Context resolution (ONCE per dispatch) ──
async function resolveContext(conversationId: string): Promise<ResolvedContext> {
  const userId = await getCurrentUserId();
  const orbit = getOrbitIdentity();
  return {
    conversationId,
    senderUserId: userId,
    senderOrbitId: orbit?.orbitId || `orbit_${userId.slice(0, 12)}`,
    receiverOrbitId: null,
    orgId: null,
  };
}

/**
 * orbitDispatch — Execute a canonical Orbit command.
 * This is the ONLY function the UI layer should call for actions.
 */
export async function orbitDispatch(cmd: OrbitCommand): Promise<OrbitCommandResult> {
  // 1. Validate
  if (!cmd?.type) return { ok: false, error: "no_command_type" };

  // 2. Idempotency
  const key = idempotencyKey(cmd);
  if (!checkIdempotency(key)) {
    if (import.meta.env.DEV) {
      console.warn(`[orbitDispatch] Duplicate command blocked: ${cmd.type}`);
    }
    return { ok: false, error: "duplicate_command" };
  }

  // 3. Execute via typed executor
  try {
    switch (cmd.type) {
      case "send_text": {
        const ctx = await resolveContext(cmd.conversationId);
        return executeSendText(ctx, cmd);
      }
      case "send_media": {
        const ctx = await resolveContext(cmd.conversationId);
        return executeSendMedia(ctx, cmd);
      }
      case "send_voice": {
        const ctx = await resolveContext(cmd.conversationId);
        return executeSendVoice(ctx, cmd);
      }
      case "send_location": {
        const ctx = await resolveContext(cmd.conversationId);
        return executeSendLocation(ctx, cmd);
      }
      case "start_call": {
        const ctx = await resolveContext(cmd.conversationId || "");
        return executeStartCall(ctx, cmd);
      }
      case "accept_call": {
        // Accept call doesn't need full context resolution
        const { acceptCallSession } = await import("@/repositories/communication.repository");
        await acceptCallSession(cmd.sessionId);
        return { ok: true, sessionId: cmd.sessionId };
      }
      case "end_call":
        return executeEndCall(cmd);
      case "edit_message":
        return executeEditMessage(cmd);
      case "reply": {
        const ctx = await resolveContext(cmd.conversationId);
        return executeReplyMessage(ctx, cmd);
      }
      default:
        return { ok: false, error: `Unknown command type: ${(cmd as any).type}` };
    }
  } catch (err: any) {
    console.error(`[orbitDispatch] ${cmd.type} failed:`, err);
    return { ok: false, error: err?.message || "Command failed" };
  }
}
