export type OrbitCallMode = "audio" | "video";
export type OrbitCallUiState =
  | "idle"
  | "incoming"
  | "outgoing"
  | "connecting"
  | "active"
  | "reconnecting"
  | "ended"
  | "missed"
  | "failed";

export interface OrbitActiveCall {
  sessionId: string;
  conversationId?: string | null;
  peerUserId?: string | null;
  peerOrbitId?: string | null;
  peerName: string;
  mode: OrbitCallMode;
  uiState: OrbitCallUiState;
  startedAt?: string | null;
  answeredAt?: string | null;
  endedAt?: string | null;
  muted: boolean;
  speakerOn: boolean;
  cameraOn: boolean;
  localVideoEnabled: boolean;
  remoteVideoEnabled: boolean;
  reconnectCount: number;
  qualityState?: string | null;
}

export interface OrbitDevicePermissionState {
  microphone: "unknown" | "granted" | "denied";
  camera: "unknown" | "granted" | "denied";
}

export interface OrbitCallHistoryItem {
  id: string;
  conversationId?: string | null;
  sessionId?: string | null;
  peerName: string;
  direction: "incoming" | "outgoing";
  callType: "audio" | "video";
  status: string;
  missed: boolean;
  startedAt?: string | null;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationSec?: number;
}
