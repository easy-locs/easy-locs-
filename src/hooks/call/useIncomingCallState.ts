/**
 * useIncomingCallState — Atomic state for incoming call UI.
 * Single responsibility: hold incoming call display state.
 */
import { useState, useRef } from "react";

export function useIncomingCallState() {
  const [showIncoming, setShowIncoming] = useState(false);
  const [incomingCallId, setIncomingCallId] = useState<string | null>(null);
  const incomingCallIdRef = useRef<string | null>(null);
  const [incomingCallerName, setIncomingCallerName] = useState("");
  const [incomingContextLabel, setIncomingContextLabel] = useState("");
  const [incomingIsVideo, setIncomingIsVideo] = useState(false);
  const [incomingOrgId, setIncomingOrgId] = useState("");
  /** Canonical conversation UUID for the incoming call */
  const [incomingConversationId, setIncomingConversationId] = useState<string | null>(null);

  // Keep ref in sync
  incomingCallIdRef.current = incomingCallId;

  const clearIncoming = () => {
    setShowIncoming(false);
    setIncomingCallId(null);
  };

  const setIncomingCall = (info: {
    callId: string;
    callerName: string;
    contextLabel: string;
    isVideo: boolean;
    orgId: string;
    /** Canonical conversation UUID */
    conversationId: string | null;
  }) => {
    setIncomingCallId(info.callId);
    setIncomingCallerName(info.callerName);
    setIncomingContextLabel(info.contextLabel);
    setIncomingIsVideo(info.isVideo);
    setIncomingOrgId(info.orgId);
    setIncomingConversationId(info.conversationId);
    setShowIncoming(true);
  };

  return {
    showIncoming, setShowIncoming,
    incomingCallId, incomingCallIdRef,
    incomingCallerName, incomingContextLabel,
    incomingIsVideo, incomingOrgId,
    /** Canonical conversation ID */
    incomingConversationId,
    clearIncoming, setIncomingCall,
  };
}
