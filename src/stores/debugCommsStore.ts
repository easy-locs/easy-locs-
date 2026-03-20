import { create } from "zustand";

type DebugState = {
  orbitId: string | null;
  email: string | null;
  conversationId: string | null;
  peerOrbitId: string | null;

  lastMessageId: string | null;
  lastMessageBody: string | null;
  lastMessageCreatedAt: string | null;

  lastCallSessionId: string | null;
  lastCallStatus: string | null;
  lastCallType: string | null;

  realtimeMessagesReady: boolean;
  realtimeCallsReady: boolean;
  realtimeSignalsReady: boolean;

  webrtcConnectionState: string;
  webrtcIceConnectionState: string;
  webrtcIceGatheringState: string;
  hasRelayCandidate: boolean;

  geoPermission: string | null;
  geoLat: number | null;
  geoLng: number | null;

  turnFetched: boolean;
  turnServerCount: number;

  setIdentity: (payload: { orbitId?: string | null; email?: string | null }) => void;
  setConversation: (payload: { conversationId?: string | null; peerOrbitId?: string | null }) => void;
  setLastMessage: (payload: {
    lastMessageId?: string | null;
    lastMessageBody?: string | null;
    lastMessageCreatedAt?: string | null;
  }) => void;
  setLastCall: (payload: {
    lastCallSessionId?: string | null;
    lastCallStatus?: string | null;
    lastCallType?: string | null;
  }) => void;
  setRealtime: (payload: {
    realtimeMessagesReady?: boolean;
    realtimeCallsReady?: boolean;
    realtimeSignalsReady?: boolean;
  }) => void;
  setWebrtc: (payload: {
    webrtcConnectionState?: string;
    webrtcIceConnectionState?: string;
    webrtcIceGatheringState?: string;
    hasRelayCandidate?: boolean;
  }) => void;
  setGeo: (payload: {
    geoPermission?: string | null;
    geoLat?: number | null;
    geoLng?: number | null;
  }) => void;
  setTurn: (payload: {
    turnFetched?: boolean;
    turnServerCount?: number;
  }) => void;
};

export const useDebugCommsStore = create<DebugState>((set) => ({
  orbitId: null,
  email: null,
  conversationId: null,
  peerOrbitId: null,

  lastMessageId: null,
  lastMessageBody: null,
  lastMessageCreatedAt: null,

  lastCallSessionId: null,
  lastCallStatus: null,
  lastCallType: null,

  realtimeMessagesReady: false,
  realtimeCallsReady: false,
  realtimeSignalsReady: false,

  webrtcConnectionState: "new",
  webrtcIceConnectionState: "new",
  webrtcIceGatheringState: "new",
  hasRelayCandidate: false,

  geoPermission: null,
  geoLat: null,
  geoLng: null,

  turnFetched: false,
  turnServerCount: 0,

  setIdentity: (payload) => set((s) => ({ ...s, ...payload })),
  setConversation: (payload) => set((s) => ({ ...s, ...payload })),
  setLastMessage: (payload) => set((s) => ({ ...s, ...payload })),
  setLastCall: (payload) => set((s) => ({ ...s, ...payload })),
  setRealtime: (payload) => set((s) => ({ ...s, ...payload })),
  setWebrtc: (payload) => set((s) => ({ ...s, ...payload })),
  setGeo: (payload) => set((s) => ({ ...s, ...payload })),
  setTurn: (payload) => set((s) => ({ ...s, ...payload })),
}));
