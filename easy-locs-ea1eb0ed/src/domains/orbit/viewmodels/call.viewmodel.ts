/**
 * Call ViewModel Bridge — Projects callStore into stable UI model.
 *
 * OWNER: NO — read-only projection.
 * SOURCE: callStore (canonical)
 * OUTPUT: stable props for call overlay / call screen rendering.
 */
import { useMemo } from "react";
import { useCallStore } from "@/stores/orbit/call.store";
import type { CallUIState } from "@/stores/orbit/call.store";

export interface CallViewModel {
  hasActiveCall: boolean;
  isIncoming: boolean;
  isOutgoing: boolean;
  isActive: boolean;
  isRinging: boolean;
  isConnecting: boolean;
  isEnded: boolean;
  callId: string | null;
  conversationId: string | null;
  peerName: string;
  peerAvatarUrl: string | null;
  mode: "audio" | "video" | null;
  uiState: CallUIState | null;
  muted: boolean;
  speakerOn: boolean;
  cameraOn: boolean;
  elapsed: number;
  error: string | null;
}

const ACTIVE_STATES: CallUIState[] = ["calling", "ringing", "connecting", "active", "reconnecting"];
const RINGING_STATES: CallUIState[] = ["calling", "ringing"];
const CONNECTING_STATES: CallUIState[] = ["connecting", "reconnecting"];
const ENDED_STATES: CallUIState[] = ["ended", "missed", "declined", "failed"];

/**
 * useCallViewModel — Read-only projection of call state for UI.
 */
export function useCallViewModel(): CallViewModel {
  const activeCall = useCallStore((s) => s.activeCall);
  const hasActiveCall = useCallStore((s) => s.hasActiveCall);

  return useMemo((): CallViewModel => {
    if (!activeCall) {
      return {
        hasActiveCall: false,
        isIncoming: false,
        isOutgoing: false,
        isActive: false,
        isRinging: false,
        isConnecting: false,
        isEnded: false,
        callId: null,
        conversationId: null,
        peerName: "",
        peerAvatarUrl: null,
        mode: null,
        uiState: null,
        muted: false,
        speakerOn: false,
        cameraOn: false,
        elapsed: 0,
        error: null,
      };
    }

    return {
      hasActiveCall,
      isIncoming: activeCall.direction === "incoming",
      isOutgoing: activeCall.direction === "outgoing",
      isActive: activeCall.uiState === "active",
      isRinging: RINGING_STATES.includes(activeCall.uiState),
      isConnecting: CONNECTING_STATES.includes(activeCall.uiState),
      isEnded: ENDED_STATES.includes(activeCall.uiState),
      callId: activeCall.callId,
      conversationId: activeCall.conversationId ?? null,
      peerName: activeCall.peer.name,
      peerAvatarUrl: activeCall.peer.avatarUrl ?? null,
      mode: activeCall.mode,
      uiState: activeCall.uiState,
      muted: activeCall.muted,
      speakerOn: activeCall.speakerOn,
      cameraOn: activeCall.cameraOn,
      elapsed: activeCall.elapsed,
      error: activeCall.error,
    };
  }, [activeCall, hasActiveCall]);
}
