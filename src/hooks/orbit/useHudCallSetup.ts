/**
 * useHudCallSetup — Extracted from HudChatPanel.
 * Single responsibility: audio/video call initiation with permission checks.
 */
import { useCallback } from "react";
import { toast } from "sonner";
import type { ConversationThread } from "@/components/communication-hub/types";

export function useHudCallSetup(
  thread: ConversationThread | null,
  devicePermissions: {
    permissions: { microphone: string; camera: string };
    requestMicrophone: () => Promise<boolean>;
    requestCamera: () => Promise<boolean>;
  },
  callActionsV2: {
    createOutgoingCall: (opts: any) => Promise<any>;
  },
  callStateV2: {
    startOutgoing: (opts: any) => void;
  },
) {
  const handleStartAudioCall = useCallback(async () => {
    const peerTarget = thread?.peerOrbitId || thread?.peerUserId;
    if (!peerTarget) {
      toast.error("No peer available for call");
      return;
    }
    const micOk = devicePermissions.permissions.microphone === "granted" || await devicePermissions.requestMicrophone();
    if (!micOk) return;
    const convId = thread!.conversationId || null;
    const session = await callActionsV2.createOutgoingCall({
      conversationId: convId,
      peerOrbitId: peerTarget,
      peerName: thread!.name || "Contact",
      mode: "audio",
    });
    if (!session) return;
    callStateV2.startOutgoing({
      sessionId: session.id,
      conversationId: convId,
      peerOrbitId: peerTarget,
      peerUserId: thread!.peerUserId || null,
      peerName: thread!.name || "Contact",
      mode: "audio",
    });
  }, [thread, devicePermissions, callActionsV2, callStateV2]);

  const handleStartVideoCall = useCallback(async () => {
    const peerTarget = thread?.peerOrbitId || thread?.peerUserId;
    if (!peerTarget) {
      toast.error("No peer available for video call");
      return;
    }
    const micOk = devicePermissions.permissions.microphone === "granted" || await devicePermissions.requestMicrophone();
    const camOk = devicePermissions.permissions.camera === "granted" || await devicePermissions.requestCamera();
    if (!micOk || !camOk) return;
    const convId2 = thread!.conversationId || null;
    const session = await callActionsV2.createOutgoingCall({
      conversationId: convId2,
      peerOrbitId: peerTarget,
      peerName: thread!.name || "Contact",
      mode: "video",
    });
    if (!session) return;
    callStateV2.startOutgoing({
      sessionId: session.id,
      conversationId: convId2,
      peerOrbitId: peerTarget,
      peerUserId: thread!.peerUserId || null,
      peerName: thread!.name || "Contact",
      mode: "video",
    });
  }, [thread, devicePermissions, callActionsV2, callStateV2]);

  return { handleStartAudioCall, handleStartVideoCall };
}
