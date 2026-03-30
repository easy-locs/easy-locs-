/**
 * CallProvider — THIN ORCHESTRATOR for call state.
 * Composes atomic units: useCallState, useIncomingCallState, useIncomingCallListener,
 * useOutgoingCall, useCallLifecycle, useMyOrbitId.
 *
 * PHASE 3: Bridges CallManager media streams to canonical store for audio playback.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CallManager } from "@/lib/call-manager";
import IncomingCallDialog from "./IncomingCallDialog";
import { OrbitCallScreen } from "./OrbitCallScreen";
import { useCallState } from "@/hooks/call/useCallState";
import { useIncomingCallState } from "@/hooks/call/useIncomingCallState";
import { useIncomingCallListener } from "@/hooks/call/useIncomingCallListener";
import { useOutgoingCall } from "@/hooks/call/useOutgoingCall";
import { useCallLifecycle } from "@/hooks/call/useCallLifecycle";
import { useMyOrbitId } from "@/hooks/call/useMyOrbitId";
import { useCallStore, type CallUIState } from "@/stores/orbit/call.store";
import { CallAudioEngine } from "@/families/calls/call-audio-engine";

interface CallContextType {
  startCall: (opts: {
    targetId: string; conversationId?: string; entityType?: string;
    entityId?: string; contextLabel?: string; peerName: string; isVideo?: boolean;
    /** @deprecated Use conversationId */ threadId?: string;
    /** @deprecated Use entityType */ contextType?: string;
    /** @deprecated Use entityId */ contextId?: string;
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

  // Canonical call store
  const callStore = useCallStore();
  const prevUiStateRef = useRef<CallUIState | null>(null);
  const callManagerRef = useRef<CallManager | null>(null);

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

  // Legacy state containers (kept for backward compat with HudChatPanel)
  const {
    callState, setCallState, peerName, setPeerName,
    contextLabel, setContextLabel, showCallDialog, setShowCallDialog,
    isStartingCall, setIsStartingCall, activeCallRef, startingCallRef,
    resetCallState,
  } = useCallState();

  const incoming = useIncomingCallState();
  const [callManager, setCallManager] = useState<CallManager | null>(null);

  // Keep callManagerRef in sync
  useEffect(() => {
    callManagerRef.current = callManager;
  }, [callManager]);

  // Wire incoming listener
  useIncomingCallListener(
    user?.id, myOrbitId, incoming.incomingCallIdRef,
    incoming.setIncomingCall, incoming.clearIncoming,
  );

  // Helper: wire CallManager state changes to both legacy + canonical store
  const wireManagerToStores = useCallback((manager: CallManager) => {
    manager.onStateChange = (state) => {
      setCallState((prev) => ({ ...prev, ...state }));

      // Sync to canonical store
      if (state.status) {
        const stateMap: Record<string, CallUIState> = {
          idle: "idle", ringing: "ringing", connecting: "connecting",
          active: "active", ended: "ended", declined: "declined",
          missed: "missed", failed: "failed", network_blocked: "failed",
        };
        const mapped = stateMap[state.status] || "calling";
        callStore.transition(mapped);
      }
      if (state.elapsed !== undefined) {
        callStore.setElapsed(state.elapsed);
      }
      if (state.error !== undefined) {
        callStore.setError(state.error || null);
      }

      // ── CRITICAL: Bridge media streams to canonical store ──
      if (state.remoteStream) {
        useCallStore.getState().setRemoteStream(state.remoteStream as MediaStream);
      }
      if (state.localStream) {
        useCallStore.getState().setLocalStream(state.localStream as MediaStream);
      }
    };
  }, [callStore, setCallState]);

  // Wire outgoing call
  const { startCall } = useOutgoingCall(
    user?.id, startingCallRef,
    useCallback(({ manager, peerName: pn, contextLabel: cl, meta, isVideo }) => {
      wireManagerToStores(manager);

      setCallManager(manager);
      setPeerName(pn);
      setContextLabel(cl);
      activeCallRef.current = meta;
      setShowCallDialog(true);

      // Populate canonical store
      callStore.startOutgoing({
        callId: meta.callId,
        conversationId: meta.conversationId,
        peer: { userId: "", name: pn },
        mode: isVideo ? "video" : "audio",
      });
    }, [callStore, wireManagerToStores]),
    setIsStartingCall,
  );

  // Wire lifecycle
  const { handleAcceptIncoming, handleDeclineIncoming, handleMissedIncoming, handleCloseCall } = useCallLifecycle(
    user?.id, activeCallRef, callManager, callState.status,
    useCallback(() => {
      resetCallState();
      setCallManager(null);
      // Also reset canonical store after auto-dismiss
      setTimeout(() => callStore.reset(), 3500);
    }, [resetCallState, callStore]),
  );

  // Accept incoming call handler (shared between IncomingCallDialog and OrbitCallScreen)
  const doAcceptIncoming = useCallback(() => {
    // Populate canonical store for incoming
    callStore.setIncoming({
      callId: incoming.incomingCallId || "",
      conversationId: incoming.incomingConversationId || undefined,
      peer: { userId: "", name: incoming.incomingCallerName },
      mode: incoming.incomingIsVideo ? "video" : "audio",
    });
    callStore.transition("connecting");

    handleAcceptIncoming(
      incoming.incomingCallId!, incoming.incomingCallerName,
      incoming.incomingContextLabel, incoming.incomingIsVideo,
      incoming.incomingOrgId, incoming.incomingConversationId,
      (manager, pn, cl) => {
        wireManagerToStores(manager);
        setCallManager(manager);
        setPeerName(pn);
        setContextLabel(cl);
        setShowCallDialog(true);
        incoming.clearIncoming();
      },
    );
  }, [callStore, incoming, handleAcceptIncoming, wireManagerToStores]);

  // Listen for accept event from OrbitCallScreen
  useEffect(() => {
    const handler = () => doAcceptIncoming();
    window.addEventListener("orbit:call:accept", handler);
    return () => window.removeEventListener("orbit:call:accept", handler);
  }, [doAcceptIncoming]);

  // Wire canonical store's endCall to the actual call manager
  useEffect(() => {
    const unsub = useCallStore.subscribe((state, prevState) => {
      if (prevState.activeCall && !state.hasActiveCall && state.activeCall?.uiState === "ended") {
        if (callManagerRef.current) {
          const s = callState.status as string;
          if (!["ended", "declined", "missed", "failed"].includes(s || "")) {
            callManagerRef.current.endCall().catch(() => {});
          }
        }
      }
    });
    return unsub;
  }, [callState.status]);

  return (
    <CallContext.Provider value={{
      startCall,
      isInCall: showCallDialog || callStore.hasActiveCall,
      isStartingCall,
    }}>
      {children}

      {/* Canonical full-screen call page */}
      <OrbitCallScreen />

      {/* Legacy incoming call dialog (still used for notifications) */}
      <IncomingCallDialog
        open={incoming.showIncoming}
        callerName={incoming.incomingCallerName}
        contextLabel={incoming.incomingContextLabel}
        isVideo={incoming.incomingIsVideo}
        onAccept={doAcceptIncoming}
        onDecline={() => {
          handleDeclineIncoming(incoming.incomingCallId, incoming.incomingConversationId, incoming.incomingOrgId);
          incoming.clearIncoming();
        }}
        onMissed={() => {
          handleMissedIncoming(incoming.incomingCallId, incoming.incomingConversationId, incoming.incomingOrgId);
          incoming.clearIncoming();
        }}
      />
    </CallContext.Provider>
  );
}
