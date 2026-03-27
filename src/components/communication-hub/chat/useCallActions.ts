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

  const handleStartCall = useCallback((isVideo: boolean) => {
    void runGuardedAction(
      async () => {
        const isDirect = thread?.conversationType === "direct";
        const targetId = isDirect ? thread?.peerUserId : (thread?.peerUserId || thread?.tenantId);

        console.log("[useCallActions] handleStartCall", {
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
          toast.error(isDirect ? "Impossible d'appeler ce contact : peer introuvable" : "Unable to resolve call target — no peer found");
          throw new Error("No call target resolved");
        }

        haptic("medium");
        await startCall({
          targetId,
          threadId: thread?.v2ConversationId || thread?.threadId,
          contextType: thread?.conversationType || "direct",
          contextId: thread?.v2ConversationId || thread?.contextId,
          contextLabel: thread?.name,
          peerName: thread?.name || "Contact",
          isVideo,
        });
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
      console.error("[useCallActions] call failed", err);
    });
  }, [thread, startCall]);

  return { handleStartCall, isInCall, isStartingCall };
}
