/**
 * call.store — Canonical call state machine.
 * Single source of truth for ALL call UI state.
 * States: idle → calling → ringing → connecting → active → ended
 * Also: missed, declined, failed
 *
 * PHASE 3: Stores media streams + exposes callManager ref for hardware control.
 */
import { create } from "zustand";

export type CallUIState =
  | "idle"
  | "calling"       // outgoing: session created, waiting for peer
  | "ringing"       // outgoing: peer is being alerted
  | "incoming"      // incoming: we're being called
  | "connecting"    // peer accepted, WebRTC handshake
  | "active"        // call in progress
  | "reconnecting"  // ICE restart
  | "ended"         // clean hangup
  | "missed"        // no answer
  | "declined"      // peer declined
  | "failed";       // network/media error

export interface CallPeer {
  userId: string;
  orbitId?: string;
  name: string;
  avatarUrl?: string | null;
}

export interface ActiveCall {
  callId: string;
  conversationId?: string;
  peer: CallPeer;
  mode: "audio" | "video";
  direction: "outgoing" | "incoming";
  uiState: CallUIState;
  startedAt: number;
  muted: boolean;
  speakerOn: boolean;
  cameraOn: boolean;
  elapsed: number;
  error: string | null;
}

interface CallStoreState {
  activeCall: ActiveCall | null;
  hasActiveCall: boolean;

  /** Media streams — set by CallProvider when CallManager reports them */
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;

  /** CallManager ref — set by CallProvider for hardware control */
  _callManagerRef: { current: any } | null;

  // ── Actions ──
  startOutgoing: (params: {
    callId: string;
    conversationId?: string;
    peer: CallPeer;
    mode: "audio" | "video";
  }) => void;

  setIncoming: (params: {
    callId: string;
    conversationId?: string;
    peer: CallPeer;
    mode: "audio" | "video";
  }) => void;

  transition: (state: CallUIState) => void;
  setElapsed: (elapsed: number) => void;
  setError: (error: string | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setCallManagerRef: (ref: { current: any } | null) => void;

  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleCamera: () => void;
  endCall: (finalState?: CallUIState) => void;
  reset: () => void;
}

export const useCallStore = create<CallStoreState>((set, get) => ({
  activeCall: null,
  hasActiveCall: false,
  remoteStream: null,
  localStream: null,
  _callManagerRef: null,

  startOutgoing: (params) =>
    set({
      activeCall: {
        callId: params.callId,
        conversationId: params.conversationId,
        peer: params.peer,
        mode: params.mode,
        direction: "outgoing",
        uiState: "calling",
        startedAt: Date.now(),
        muted: false,
        speakerOn: params.mode === "video",
        cameraOn: params.mode === "video",
        elapsed: 0,
        error: null,
      },
      hasActiveCall: true,
    }),

  setIncoming: (params) =>
    set({
      activeCall: {
        callId: params.callId,
        conversationId: params.conversationId,
        peer: params.peer,
        mode: params.mode,
        direction: "incoming",
        uiState: "incoming",
        startedAt: Date.now(),
        muted: false,
        speakerOn: params.mode === "video",
        cameraOn: params.mode === "video",
        elapsed: 0,
        error: null,
      },
      hasActiveCall: true,
    }),

  transition: (state) => {
    const call = get().activeCall;
    if (!call) return;
    set({
      activeCall: { ...call, uiState: state },
      hasActiveCall: !["idle", "ended", "missed", "declined", "failed"].includes(state),
    });
  },

  setElapsed: (elapsed) => {
    const call = get().activeCall;
    if (call) set({ activeCall: { ...call, elapsed } });
  },

  setError: (error) => {
    const call = get().activeCall;
    if (call) set({ activeCall: { ...call, error } });
  },

  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setCallManagerRef: (ref) => set({ _callManagerRef: ref }),

  toggleMute: () => {
    const call = get().activeCall;
    if (!call) return;
    const newMuted = !call.muted;
    // Delegate to actual CallManager
    const mgr = get()._callManagerRef?.current;
    if (mgr?.toggleMute) mgr.toggleMute();
    set({ activeCall: { ...call, muted: newMuted } });
  },

  toggleSpeaker: () => {
    const call = get().activeCall;
    if (!call) return;
    const newSpeaker = !call.speakerOn;
    set({ activeCall: { ...call, speakerOn: newSpeaker } });
    // Note: Web Audio API doesn't support earpiece/speaker routing natively.
    // On native (Capacitor), this would delegate to a native plugin.
  },

  toggleCamera: () => {
    const call = get().activeCall;
    if (!call) return;
    const mgr = get()._callManagerRef?.current;
    if (mgr?.toggleVideo) mgr.toggleVideo();
    set({ activeCall: { ...call, cameraOn: !call.cameraOn } });
  },

  endCall: (finalState = "ended") => {
    const call = get().activeCall;
    if (call) {
      set({
        activeCall: { ...call, uiState: finalState },
        hasActiveCall: false,
      });
    }
  },

  reset: () => set({
    activeCall: null,
    hasActiveCall: false,
    remoteStream: null,
    localStream: null,
    _callManagerRef: null,
  }),
}));
