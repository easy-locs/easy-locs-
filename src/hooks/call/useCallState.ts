/**
 * useCallState — Atomic state container for call UI.
 * Single responsibility: hold all call-related UI state.
 */
import { useState, useRef } from "react";
import type { CallState } from "@/lib/call-manager";

export interface ActiveCallMeta {
  callId: string;
  threadId?: string;
  orgId: string;
  contextId?: string;
}

export function useCallState() {
  const [callState, setCallState] = useState<Partial<CallState>>({});
  const [peerName, setPeerName] = useState("");
  const [contextLabel, setContextLabel] = useState("");
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const activeCallRef = useRef<ActiveCallMeta | null>(null);
  const startingCallRef = useRef(false);

  const resetCallState = () => {
    activeCallRef.current = null;
    setShowCallDialog(false);
    setCallState({});
    startingCallRef.current = false;
    setIsStartingCall(false);
  };

  return {
    callState, setCallState,
    peerName, setPeerName,
    contextLabel, setContextLabel,
    showCallDialog, setShowCallDialog,
    isStartingCall, setIsStartingCall,
    activeCallRef, startingCallRef,
    resetCallState,
  };
}
