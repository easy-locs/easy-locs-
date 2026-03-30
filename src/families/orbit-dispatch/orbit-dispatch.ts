/**
 * OrbitDispatch — Canonical Action Pipeline.
 * Single entry point for ALL Orbit user actions.
 *
 * Responsibilities:
 * 1. Validate command type
 * 2. Idempotency guard
 * 3. Resolve identity context (ONCE)
 * 4. Register inflight request
 * 5. Delegate to typed executor (intent→canonical→optimistic→transport→reconcile)
 * 6. Release inflight request
 *
 * This dispatcher does NOT contain business logic.
 * All logic lives in the executor layer (src/families/orbit-dispatch/pipeline/).
 */
import type { OrbitCommand, OrbitCommandResult } from "./orbit-commands";
import { getOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { supabase } from "@/integrations/supabase/client";
import type { ResolvedContext } from "./pipeline/pipeline-types";
import { checkIdempotencyGuard, issueRequestId, registerInflightRequest, releaseInflightRequest } from "./send-locks";

// ── Executors ──
import { executeSendText } from "./pipeline/executeSendText";
import { executeSendMedia } from "./pipeline/executeSendMedia";
import { executeSendMediaBatch } from "./pipeline/executeSendMediaBatch";
import { executeSendVoice } from "./pipeline/executeSendVoice";
import { executeSendLocation } from "./pipeline/executeSendLocation";
import { executeStartCall } from "./pipeline/executeStartCall";
import { executeEndCall } from "./pipeline/executeEndCall";
import { executeEditMessage } from "./pipeline/executeEditMessage";
import { executeReplyMessage } from "./pipeline/executeReplyMessage";

async function resolveCurrentUserIdFromSession(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

// ── Context resolution (ONCE per dispatch) ──
async function resolveContext(conversationId: string): Promise<ResolvedContext> {
  const orbit = getOrbitIdentity();
  const senderUserId = orbit?.userId || await resolveCurrentUserIdFromSession();

  return {
    conversationId,
    senderUserId,
    senderOrbitId: orbit?.orbitId || `orbit_${senderUserId.slice(0, 12)}`,
    receiverOrbitId: null,
    orgId: null,
  };
}

/**
 * orbitDispatch — Execute a canonical Orbit command.
 * This is the ONLY function the UI layer should call for actions.
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

  try {
    switch (cmd.type) {
      case "send_text": {
        const ctx = await resolveContext(cmd.conversationId);
        return { ...await executeSendText(ctx, cmd), requestId };
      }
      case "send_media": {
        const ctx = await resolveContext(cmd.conversationId);
        return { ...await executeSendMedia(ctx, cmd), requestId };
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
      case "accept_call": {
        const { acceptCallSession } = await import("@/repositories/communication.repository");
        await acceptCallSession(cmd.sessionId);
        return { ok: true, sessionId: cmd.sessionId, requestId };
      }
      case "end_call":
        return { ...await executeEndCall(cmd), requestId };
      case "edit_message":
        return { ...await executeEditMessage(cmd), requestId };
      case "reply": {
        const ctx = await resolveContext(cmd.conversationId);
        return { ...await executeReplyMessage(ctx, cmd), requestId };
      }
      default:
        return { ok: false, error: `Unknown command type: ${(cmd as any).type}`, requestId };
    }
  } catch (err: any) {
    console.error(`[orbitDispatch] ${cmd.type} failed:`, err);
    return { ok: false, error: err?.message || "Command failed", requestId };
  } finally {
    releaseInflightRequest(requestId);
  }
}
