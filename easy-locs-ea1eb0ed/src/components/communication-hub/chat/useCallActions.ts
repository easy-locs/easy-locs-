/**
 * useCallActions — Encapsulates canonical call initiation logic.
 * Always resolves to a single target path: peer user when available, otherwise workspace owner path.
 * Wrapped with runGuardedAction for telemetry + timeout detection.
 */
import { useCallback, useRef } from "react";
import { useCall } from "@/components/call/CallProvider";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { runGuardedAction } from "@/lib/runtime/action-guard";
import type { ConversationThread } from "../types";

/** Resolve canonical conversationId from thread */
function getConversationId(thread: ConversationThread | null): string | undefined {
  return thread?.conversationId || thread?.v2ConversationId || undefined;
}

export function useCallActions(thread: ConversationThread | null, workspaceId: string | null) {
  const { startCall, isInCall, isStartingCall } = useCall();
  const callLockRef = useRef(false);

  const trace = useCallback((step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
    const logger = phase === "error" ? console.error : console.log;
    logger(`[CALL][${step}] ${phase}:`, payload ?? {});
  }, []);

  const handleStartCall = useCallback((isVideo: boolean) => {
    if (callLockRef.current || isInCall || isStartingCall) return;
    callLockRef.current = true;
    void runGuardedAction(
      async () => {
        const conversationId = getConversationId(thread);

        trace("call.button.trigger", "input", {
          conversationId: conversationId ?? null,
          threadId: thread?.id ?? null,
          isVideo,
          workspaceId,
        });

        const isDirect = thread?.conversationType === "direct";
        const targetId = isDirect
          ? (thread?.peerUserId || thread?.peerOrbitId)
          : (thread?.peerUserId || thread?.peerOrbitId || thread?.tenantId);

        trace("call.target.resolve", "input", {
          conversationId: conversationId ?? null,
          peerUserId: thread?.peerUserId,
          peerOrbitId: thread?.peerOrbitId,
          entityId: thread?.entityId,
          isDirect,
          resolvedTargetId: targetId,
          isVideo,
        });

        if (!targetId) {
          trace("call.target.resolve", "error", { reason: "no_target_resolved" });
          toast.error("Unable to resolve call target — no peer found");
          throw new Error("No call target resolved");
        }

        trace("call.target.resolve", "output", {
          targetId,
          entityId: thread?.entityId || null,
        });

        haptic("medium");
        trace("call.rpc.create", "input", {
          targetId,
          conversationId: conversationId ?? null,
          entityType: thread?.conversationType || "direct",
          entityId: thread?.entityId || null,
          isVideo,
        });
        const success = await startCall({
          targetId,
          conversationId,
          entityType: thread?.conversationType || "direct",
          entityId: thread?.entityId,
          contextLabel: thread?.name,
          peerName: thread?.name || "Contact",
          isVideo,
        });
        if (!success) {
          trace("call.rpc.create", "error", { reason: "start_call_returned_false" });
          toast.error(isVideo ? "Video call could not be started" : "Call could not be started");
          return;
        }
        trace("call.rpc.create", "output", { requested: true, targetId, isVideo });
      },
      {
        routeKey: "orbit",
        componentKey: "useCallActions",
        flowKey: isVideo ? "start_video_call" : "start_audio_call",
        actionKey: isVideo ? "start_video_call" : "start_audio_call",
        timeoutMs: 10000,
        slowMs: 1800,
      },
    ).catch((err) => {
      trace("call.rpc.create", "error", { message: err?.message || "call_failed" });
    }).finally(() => {
      setTimeout(() => { callLockRef.current = false; }, 500);
    });
  }, [thread, startCall, workspaceId, trace, isInCall, isStartingCall]);

  return { handleStartCall, isInCall, isStartingCall };
}
