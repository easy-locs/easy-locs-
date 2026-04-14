export interface GroupCallParticipant {
  userId: string;
  orbitId: string;
  name: string;
  avatarUrl?: string | null;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState | "pending";
  qualityLabel?: "excellent" | "good" | "fair" | "poor" | "critical";
  joinedAt: number;
}

export type GroupCallStatus =
  | "idle"
  | "creating"
  | "joining"
  | "active"
  | "reconnecting"
  | "ended"
  | "failed";

export interface GroupCallRoom {
  roomId: string;
  roomName: string;
  createdBy: string;
  maxParticipants: number;
  participants: GroupCallParticipant[];
  status: GroupCallStatus;
  mode: "audio" | "video";
  startedAt: number;
  elapsed: number;
  isRecording: boolean;
}

export interface GroupCallSignal {
  type: "offer" | "answer" | "ice" | "join" | "leave" | "mute_change" | "camera_change" | "screen_share";
  from: string;
  to?: string;
  data: string;
  roomId: string;
}

export const MAX_GROUP_PARTICIPANTS = 8;
