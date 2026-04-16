import { callEdgeFunction } from "@/lib/edge-client";

export interface LiveKitRoomConfig {
  roomName: string;
  participantName?: string;
  maxParticipants?: number;
}

export interface LiveKitTokenResponse {
  token: string;
  livekitUrl: string;
  room?: {
    name: string;
    sid: string;
    numParticipants: number;
  };
}

export async function createLiveKitRoom(config: LiveKitRoomConfig): Promise<LiveKitTokenResponse> {
  return callEdgeFunction<LiveKitTokenResponse>("livekit-room-token", {
    action: "create_room",
    roomName: config.roomName,
    participantName: config.participantName,
    maxParticipants: config.maxParticipants ?? 50,
  });
}

export async function joinLiveKitRoom(
  roomName: string,
  participantName?: string
): Promise<LiveKitTokenResponse> {
  return callEdgeFunction<LiveKitTokenResponse>("livekit-room-token", {
    action: "join_room",
    roomName,
    participantName,
  });
}

export function generateCallRoomName(callId: string): string {
  return `orbit-call-${callId}`;
}

export function generateGroupRoomName(groupId: string): string {
  return `orbit-group-${groupId}`;
}

export function isLiveKitAvailable(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL;
}
