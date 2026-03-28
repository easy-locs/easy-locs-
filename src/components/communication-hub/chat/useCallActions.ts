/**
 * useCallActions — Encapsulates canonical call initiation logic.
 * Always resolves to a single target path: peer user when available, otherwise workspace owner path.
 * Wrapped with runGuardedAction for telemetry + timeout detection.
 */
import { useCallback } from "react";
import { useCall } from "@/components/call/CallProvider";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { runGuardedAction } from "@/lib/runtime/action-guard";
import type { ConversationThread } from "../types";

export function useCallActions(thread: ConversationThread | null, workspaceId: string | null) {
  const { startCall, isInCall, isStartingCall } = useCall();

  const trace = useCallback((step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
    const logger = phase === "error" ? console.error : console.log;
    logger(`[CALL][${step}] ${phase}:`, payload ?? {});
  }, []);

  const handleStartCall = useCallback((isVideo: boolean) => {
    void runGuardedAction(
      async () => {
        trace("call.button.trigger", "input", {
          threadId: thread?.id ?? null,
          isVideo,
          workspaceId,
        });

        const isDirect = thread?.conversationType === "direct";
        const targetId = isDirect
          ? (thread?.peerUserId || thread?.peerOrbitId)
          : (thread?.peerUserId || thread?.peerOrbitId || thread?.tenantId);

        trace("call.target.resolve", "input", {
          threadId: thread?.id,
          v2ConversationId: thread?.v2ConversationId,
          peerUserId: thread?.peerUserId,
          peerOrbitId: thread?.peerOrbitId,
          contextId: thread?.v2ConversationId || thread?.contextId,
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
          contextId: thread?.v2ConversationId || thread?.contextId || null,
        });

        haptic("medium");
        trace("call.rpc.create", "input", {
          targetId,
          threadId: thread?.v2ConversationId || thread?.threadId || null,
          contextType: thread?.conversationType || "direct",
          contextId: thread?.v2ConversationId || thread?.contextId || null,
          isVideo,
        });
        await startCall({
          targetId,
          threadId: thread?.v2ConversationId || thread?.threadId,
          contextType: thread?.conversationType || "direct",
          contextId: thread?.v2ConversationId || thread?.contextId,
          contextLabel: thread?.name,
          peerName: thread?.name || "Contact",
          isVideo,
        });
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
    });
  }, [thread, startCall, workspaceId, trace]);

  return { handleStartCall, isInCall, isStartingCall };
}
