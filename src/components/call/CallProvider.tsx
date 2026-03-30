/**
 * CallProvider — THIN ORCHESTRATOR for call state.
 * PHASE 5: Single source of truth via useCallStore. OrbitCallScreen handles ALL call UI (incoming + outgoing + active).
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CallManager } from "@/lib/call-manager";
import { OrbitCallScreen } from "./OrbitCallScreen";
import { useIncomingCallState } from "@/hooks/call/useIncomingCallState";
import { useIncomingCallListener } from "@/hooks/call/useIncomingCallListener";
import { useOutgoingCall } from "@/hooks/call/useOutgoingCall";
import { useMyOrbitId } from "@/hooks/call/useMyOrbitId";
import { useCallStore, type CallUIState } from "@/stores/orbit/call.store";
import { CallAudioEngine } from "@/families/calls/call-audio-engine";
import { logCallEventToThread } from "@/lib/call-thread-logger";
import { fetchCallLogStatus } from "@/repositories/communication.repository";
import { declineIncomingCall, markCallMissed } from "@/lib/call/call-incoming-handler";
import { platformBus } from "@/lib/shared/platform-bus";

interface CallContextType {
  startCall: (opts: {
    targetId: string; conversationId?: string; entityType?: string;
    entityId?: string; contextLabel?: string; peerName: string; isVideo?: boolean;
  }) => Promise<void>;
  isInCall: boolean;
  isStartingCall: boolean;
}

const CallContext = createContext<CallContextType>({
  startCall: async () => {},
  isInCall: false,
  isStartingCall: false,
});

export const useCall = () => useContext(CallContext);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const myOrbitId = useMyOrbitId(user?.id);

  // ── SINGLE source of truth: canonical call store ──
  const callStore = useCallStore();
  const prevUiStateRef = useRef<CallUIState | null>(null);
  const callManagerRef = useRef<CallManager | null>(null);
  const activeCallMetaRef = useRef<{ callId: string; conversationId?: string; orgId: string; entityId?: string } | null>(null);
  const startingCallRef = useRef(false);
  const [isStartingCall, setIsStartingCall] = useState(false);

  // Keep callManager ref in sync with canonical store
  useEffect(() => {
    useCallStore.getState().setCallManagerRef(callManagerRef);
  }, []);

  // Sync audio engine with call state transitions
  useEffect(() => {
    const call = callStore.activeCall;
    if (!call) {
      if (prevUiStateRef.current !== null) {
        CallAudioEngine.stopAll();
        prevUiStateRef.current = null;
      }
      return;
    }
    if (prevUiStateRef.current !== call.uiState) {
      CallAudioEngine.onStateChange(prevUiStateRef.current, call.uiState, call.direction);
      prevUiStateRef.current = call.uiState;
    }
  }, [callStore.activeCall?.uiState]);

  const incoming = useIncomingCallState();
  const [callManager, setCallManager] = useState<CallManager | null>(null);

  // Keep callManagerRef in sync
  useEffect(() => { callManagerRef.current = callManager; }, [callManager]);

  // Wire incoming listener — incoming calls show via OrbitCallScreen (full-screen)
  useIncomingCallListener(
    user?.id, myOrbitId, incoming.incomingCallIdRef,
    useCallback((info) => {
      incoming.setIncomingCall(info);
      // Push to canonical store so OrbitCallScreen renders
      callStore.setIncoming({
        callId: info.callId,
        conversationId: info.conversationId || undefined,
        peer: { userId: "", name: info.callerName },
        mode: info.isVideo ? "video" : "audio",
      });
    }, [callStore, incoming.setIncomingCall]),
    useCallback(() => {
      incoming.clearIncoming();
      // If still in incoming state, reset
      if (useCallStore.getState().activeCall?.uiState === "incoming") {
        callStore.reset();
      }
    }, [callStore, incoming.clearIncoming]),
  );

  // Helper: wire CallManager state changes to canonical store (ONLY)
  const wireManagerToStore = useCallback((manager: CallManager) => {
    manager.onStateChange = (state) => {
      if (state.status) {
        const stateMap: Record<string, CallUIState> = {
          idle: "idle", ringing: "ringing", connecting: "connecting",
          active: "active", ended: "ended", declined: "declined",
          missed: "missed", failed: "failed", network_blocked: "failed",
        };
        callStore.transition(stateMap[state.status] || "calling");
      }
      if (state.elapsed !== undefined) callStore.setElapsed(state.elapsed);
      if (state.error !== undefined) callStore.setError(state.error || null);
      if (state.remoteStream) useCallStore.getState().setRemoteStream(state.remoteStream as MediaStream);
      if (state.localStream) useCallStore.getState().setLocalStream(state.localStream as MediaStream);
    };
  }, [callStore]);

  // Wire outgoing call
  const { startCall } = useOutgoingCall(
    user?.id, startingCallRef,
    useCallback(({ manager, peerName: pn, contextLabel: cl, meta, isVideo }) => {
      wireManagerToStore(manager);
      setCallManager(manager);
      activeCallMetaRef.current = meta;

      callStore.startOutgoing({
        callId: meta.callId,
        conversationId: meta.conversationId,
        peer: { userId: "", name: pn },
        mode: isVideo ? "video" : "audio",
      });
    }, [callStore, wireManagerToStore]),
    setIsStartingCall,
  );

  // Reset handler
  const handleReset = useCallback(async () => {
    const meta = activeCallMetaRef.current;
    const convId = meta?.conversationId;
    if (convId && user?.id && meta) {
      const log = await fetchCallLogStatus(meta.callId);
      if ((log as any)?.status === "ended") {
        logCallEventToThread({
          callId: meta.callId, conversationId: convId, orgId: meta.orgId,
          senderId: user.id, event: "ended",
          durationSeconds: (log as any)?.duration_sec || 0,
          entityId: meta.entityId,
        });
      }
    }
    callManager?.cleanup("provider-close");
    platformBus.emit("call:ended", { status: callStore.activeCall?.uiState || "ended" }, "orbit");
    activeCallMetaRef.current = null;
    setCallManager(null);
    setTimeout(() => callStore.reset(), 3500);
  }, [callManager, callStore, user?.id]);

  // Accept incoming call
  const doAcceptIncoming = useCallback(async () => {
    if (!user?.id || !incoming.incomingCallId) return;

    activeCallMetaRef.current = {
      callId: incoming.incomingCallId,
      conversationId: incoming.incomingConversationId || undefined,
      orgId: incoming.incomingOrgId,
    };

    callStore.setIncoming({
      callId: incoming.incomingCallId,
      conversationId: incoming.incomingConversationId || undefined,
      peer: { userId: "", name: incoming.incomingCallerName },
      mode: incoming.incomingIsVideo ? "video" : "audio",
    });
    callStore.transition("connecting");

    const manager = new CallManager({
      callId: incoming.incomingCallId, userId: user.id, role: "callee",
      onStateChange: () => {},
    });
    wireManagerToStore(manager);
    setCallManager(manager);
    incoming.clearIncoming();
    await manager.acceptCall(incoming.incomingIsVideo);
  }, [callStore, incoming, user?.id, wireManagerToStore]);

  // Listen for accept/decline events from OrbitCallScreen
  useEffect(() => {
    const handleAccept = () => doAcceptIncoming();
    const handleDecline = () => {
      if (incoming.incomingCallId && user?.id) {
        declineIncomingCall(incoming.incomingCallId, user.id);
        if (incoming.incomingConversationId) {
          logCallEventToThread({
            callId: incoming.incomingCallId,
            conversationId: incoming.incomingConversationId,
            orgId: incoming.incomingOrgId,
            senderId: user.id,
            event: "declined",
          });
        }
      }
      incoming.clearIncoming();
      callStore.endCall("declined");
    };
    window.addEventListener("orbit:call:accept", handleAccept);
    window.addEventListener("orbit:call:decline", handleDecline);
    return () => {
      window.removeEventListener("orbit:call:accept", handleAccept);
      window.removeEventListener("orbit:call:decline", handleDecline);
    };
  }, [doAcceptIncoming, incoming, user?.id, callStore]);

  // Wire canonical store's endCall to the actual call manager
  useEffect(() => {
    const unsub = useCallStore.subscribe((state, prevState) => {
      const wasActive = prevState.activeCall && prevState.hasActiveCall;
      const nowEnded = state.activeCall?.uiState === "ended" && !state.hasActiveCall;
      if (wasActive && nowEnded) {
        if (callManagerRef.current) {
          callManagerRef.current.endCall().catch(() => {});
        }
        handleReset();
      }
    });
    return unsub;
  }, [handleReset]);

  return (
    <CallContext.Provider value={{
      startCall,
      isInCall: callStore.hasActiveCall,
      isStartingCall,
    }}>
      {children}
      <OrbitCallScreen />
    </CallContext.Provider>
  );
}
