import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { resolvePeerIdentity } from "@/lib/orbit/canonical-helpers";
import { useCall } from "@/components/call/CallProvider";
import type { ConversationThread } from "@/components/communication-hub/types";

export function useHudCallSetup(
  thread: ConversationThread | null,
  devicePermissions: {
    permissions: { microphone: string; camera: string };
    requestMicrophone: () => Promise<boolean>;
    requestCamera: () => Promise<boolean>;
  },
  _callActionsV2?: unknown,
  _callStateV2?: unknown,
) {
  const { startCall } = useCall();
  const threadRef = useRef(thread);
  threadRef.current = thread;
  const permissionsRef = useRef(devicePermissions);
  permissionsRef.current = devicePermissions;

  const handleStartAudioCall = useCallback(async () => {
    const currentThread = threadRef.current;
    const peer = resolvePeerIdentity(currentThread);
    const peerTarget = peer.orbitId || peer.userId;
    if (!peerTarget) {
      toast.error("No peer available for call");
      return;
    }
    const dp = permissionsRef.current;
    const micOk = dp.permissions.microphone === "granted" || await dp.requestMicrophone();
    if (!micOk) return;

    try {
      await startCall({
        targetId: peerTarget,
        receiverUserId: peer.userId || undefined,
        receiverOrbitId: peer.orbitId || undefined,
        conversationId: currentThread?.conversationId || undefined,
        peerName: peer.displayName,
        isVideo: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Call failed";
      console.error("[useHudCallSetup] audio call error:", err);
      toast.error(message);
    }
  }, [startCall]);

  const handleStartVideoCall = useCallback(async () => {
    const currentThread = threadRef.current;
    const peer = resolvePeerIdentity(currentThread);
    const peerTarget = peer.orbitId || peer.userId;
    if (!peerTarget) {
      toast.error("No peer available for video call");
      return;
    }
    const dp = permissionsRef.current;
    const micOk = dp.permissions.microphone === "granted" || await dp.requestMicrophone();
    if (!micOk) {
      toast.error("Microphone permission is required for calls");
      return;
    }
    const camOk = dp.permissions.camera === "granted" || await dp.requestCamera();
    const useVideo = camOk;
    if (!camOk) {
      toast.info("Camera unavailable — starting audio call instead");
    }

    try {
      await startCall({
        targetId: peerTarget,
        receiverUserId: peer.userId || undefined,
        receiverOrbitId: peer.orbitId || undefined,
        conversationId: currentThread?.conversationId || undefined,
        peerName: peer.displayName,
        isVideo: useVideo,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Call failed";
      console.error("[useHudCallSetup] video call error:", err);
      toast.error(message);
    }
  }, [startCall]);

  return { handleStartAudioCall, handleStartVideoCall };
}
