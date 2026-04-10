/**
 * useIncomingCallState — Atomic state for incoming call UI.
 * Single responsibility: hold incoming call display state.
 */
import { useState, useRef, useCallback } from "react";

export function useIncomingCallState() {
  const [showIncoming, setShowIncoming] = useState(false);
  const [incomingCallId, setIncomingCallId] = useState<string | null>(null);
  const incomingCallIdRef = useRef<string | null>(null);
  const [incomingCallerName, setIncomingCallerName] = useState("");
  const [incomingContextLabel, setIncomingContextLabel] = useState("");
  const [incomingIsVideo, setIncomingIsVideo] = useState(false);
  const [incomingOrgId, setIncomingOrgId] = useState("");
  const [incomingConversationId, setIncomingConversationId] = useState<string | null>(null);

  incomingCallIdRef.current = incomingCallId;

  const clearIncoming = useCallback(() => {
    setShowIncoming(false);
    setIncomingCallId(null);
  }, []);

  const setIncomingCall = useCallback((info: {
    callId: string;
    callerName: string;
    contextLabel: string;
    isVideo: boolean;
    orgId: string;
    conversationId: string | null;
  }) => {
    setIncomingCallId(info.callId);
    setIncomingCallerName(info.callerName);
    setIncomingContextLabel(info.contextLabel);
    setIncomingIsVideo(info.isVideo);
    setIncomingOrgId(info.orgId);
    setIncomingConversationId(info.conversationId);
    setShowIncoming(true);
  }, []);

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
