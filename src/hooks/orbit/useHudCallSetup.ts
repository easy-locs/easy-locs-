/**
 * useHudCallSetup — Extracted from HudChatPanel.
 * Single responsibility: audio/video call initiation with permission checks.
 * Uses resolvePeerIdentity for canonical peer display.
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { resolvePeerIdentity } from "@/lib/orbit/canonical-helpers";
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
    const peer = resolvePeerIdentity(thread);
    const peerTarget = peer.orbitId || peer.userId;
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
      peerName: peer.displayName,
      mode: "audio",
    });
    if (!session) return;
    callStateV2.startOutgoing({
      sessionId: session.id,
      conversationId: convId,
      peerOrbitId: peerTarget,
      peerUserId: peer.userId,
      peerName: peer.displayName,
      mode: "audio",
    });
  }, [thread, devicePermissions, callActionsV2, callStateV2]);

  const handleStartVideoCall = useCallback(async () => {
    const peer = resolvePeerIdentity(thread);
    const peerTarget = peer.orbitId || peer.userId;
    if (!peerTarget) {
      toast.error("No peer available for video call");
      return;
    }
    const micOk = devicePermissions.permissions.microphone === "granted" || await devicePermissions.requestMicrophone();
    const camOk = devicePermissions.permissions.camera === "granted" || await devicePermissions.requestCamera();
    if (!micOk || !camOk) return;
    const convId = thread!.conversationId || null;
    const session = await callActionsV2.createOutgoingCall({
      conversationId: convId,
      peerOrbitId: peerTarget,
      peerName: peer.displayName,
      mode: "video",
    });
    if (!session) return;
    callStateV2.startOutgoing({
      sessionId: session.id,
      conversationId: convId,
      peerOrbitId: peerTarget,
      peerUserId: peer.userId,
      peerName: peer.displayName,
      mode: "video",
    });
  }, [thread, devicePermissions, callActionsV2, callStateV2]);

  return { handleStartAudioCall, handleStartVideoCall };
}
