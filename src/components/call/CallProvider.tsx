/**
 * CallProvider — THIN ORCHESTRATOR for call state.
 * Composes atomic units: useCallState, useIncomingCallState, useIncomingCallListener,
 * useOutgoingCall, useCallLifecycle, useMyOrbitId.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CallManager } from "@/lib/call-manager";
import InAppCallDialog from "./InAppCallDialog";
import IncomingCallDialog from "./IncomingCallDialog";
import { useCallState } from "@/hooks/call/useCallState";
import { useIncomingCallState } from "@/hooks/call/useIncomingCallState";
import { useIncomingCallListener } from "@/hooks/call/useIncomingCallListener";
import { useOutgoingCall } from "@/hooks/call/useOutgoingCall";
import { useCallLifecycle } from "@/hooks/call/useCallLifecycle";
import { useMyOrbitId } from "@/hooks/call/useMyOrbitId";

interface CallContextType {
  startCall: (opts: {
    targetId: string; threadId?: string; contextType?: string;
    contextId?: string; contextLabel?: string; peerName: string; isVideo?: boolean;
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

  // Atomic state containers
  const {
    callState, setCallState, peerName, setPeerName,
    contextLabel, setContextLabel, showCallDialog, setShowCallDialog,
    isStartingCall, setIsStartingCall, activeCallRef, startingCallRef,
    resetCallState,
  } = useCallState();

  const incoming = useIncomingCallState();
  const [callManager, setCallManager] = useState<CallManager | null>(null);

  // Wire incoming listener
  useIncomingCallListener(
    user?.id, myOrbitId, incoming.incomingCallIdRef,
    incoming.setIncomingCall, incoming.clearIncoming,
  );

  // Wire outgoing call
  const { startCall } = useOutgoingCall(
    user?.id, startingCallRef,
    useCallback(({ manager, peerName: pn, contextLabel: cl, meta, isVideo }) => {
      manager.onStateChange = (state) => setCallState((prev) => ({ ...prev, ...state }));
      setCallManager(manager);
      setPeerName(pn);
      setContextLabel(cl);
      activeCallRef.current = meta;
      setShowCallDialog(true);
    }, []),
    setIsStartingCall,
  );

  // Wire lifecycle
  const { handleAcceptIncoming, handleDeclineIncoming, handleMissedIncoming, handleCloseCall } = useCallLifecycle(
    user?.id, activeCallRef, callManager, callState.status,
    useCallback(() => {
      resetCallState();
      setCallManager(null);
    }, [resetCallState]),
  );

  return (
    <CallContext.Provider value={{ startCall, isInCall: showCallDialog, isStartingCall }}>
      {children}
      <IncomingCallDialog
        open={incoming.showIncoming}
        callerName={incoming.incomingCallerName}
        contextLabel={incoming.incomingContextLabel}
        isVideo={incoming.incomingIsVideo}
        onAccept={() => handleAcceptIncoming(
          incoming.incomingCallId!, incoming.incomingCallerName,
          incoming.incomingContextLabel, incoming.incomingIsVideo,
          incoming.incomingOrgId, incoming.incomingThreadId,
          (manager, pn, cl) => {
            manager.onStateChange = (state) => setCallState((prev) => ({ ...prev, ...state }));
            setCallManager(manager);
            setPeerName(pn);
            setContextLabel(cl);
            setShowCallDialog(true);
            incoming.clearIncoming();
          },
        )}
        onDecline={() => {
          handleDeclineIncoming(incoming.incomingCallId, incoming.incomingThreadId, incoming.incomingOrgId);
          incoming.clearIncoming();
        }}
        onMissed={() => {
          handleMissedIncoming(incoming.incomingCallId, incoming.incomingThreadId, incoming.incomingOrgId);
          incoming.clearIncoming();
        }}
      />
      <InAppCallDialog
        open={showCallDialog} onClose={handleCloseCall}
        callManager={callManager} peerName={peerName} contextLabel={contextLabel}
      />
    </CallContext.Provider>
  );
}
