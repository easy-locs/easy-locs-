import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/services/db";

export interface LiveKitParticipant {
  id: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isLocal: boolean;
  connectionQuality: "excellent" | "good" | "fair" | "poor" | "unknown";
}

export interface LiveKitRoomState {
  connected: boolean;
  connecting: boolean;
  roomName: string | null;
  participants: LiveKitParticipant[];
  localParticipant: LiveKitParticipant | null;
  isRecording: boolean;
  error: string | null;
}

interface UseLiveKitRoomOptions {
  userId: string;
  roomName: string;
  autoConnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onParticipantJoined?: (participant: LiveKitParticipant) => void;
  onParticipantLeft?: (participantId: string) => void;
}

interface LiveKitTokenResult {
  token: string;
  livekitUrl?: string;
}

async function fetchLiveKitToken(
  userId: string,
  roomName: string,
  userName?: string,
): Promise<LiveKitTokenResult> {
  const { data, error } = await db.functions.invoke("livekit-room-token", {
    body: { action: "join_room", roomName, participantName: userName || userId },
  });
  if (error) {
    throw new Error(`LiveKit token request failed: ${error.message ?? "Unknown error"}`);
  }
  if (!data?.token) {
    throw new Error("LiveKit token response missing token field");
  }
  return { token: data.token, livekitUrl: data.livekitUrl };
}

export function useLiveKitRoom(options: UseLiveKitRoomOptions) {
  const {
    userId,
    roomName,
    autoConnect = false,
    onConnected,
    onDisconnected,
    onParticipantJoined,
    onParticipantLeft,
  } = options;

  const [state, setState] = useState<LiveKitRoomState>({
    connected: false,
    connecting: false,
    roomName: null,
    participants: [],
    localParticipant: null,
    isRecording: false,
    error: null,
  });

  const roomRef = useRef<any>(null);
  const tokenRef = useRef<string | null>(null);

  const connect = useCallback(async () => {
    if (state.connected || state.connecting) return;

    setState((s) => ({ ...s, connecting: true, error: null }));

    try {
      const tokenResult = await fetchLiveKitToken(userId, roomName);
      tokenRef.current = tokenResult.token;

      let Room: any;
      try {
        const lk = await import("livekit-client");
        Room = lk.Room;
      } catch {
        throw new Error("LiveKit client library is not available. Video calls require the livekit-client package.");
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720 },
        },
      });

      roomRef.current = room;

      room.on("participantConnected", (participant: any) => {
        const p: LiveKitParticipant = {
          id: participant.identity,
          name: participant.name || participant.identity,
          isSpeaking: false,
          isMuted: participant.isMicrophoneEnabled === false,
          isCameraOn: participant.isCameraEnabled === true,
          isScreenSharing: participant.isScreenShareEnabled === true,
          isLocal: false,
          connectionQuality: "good",
        };
        setState((s) => ({
          ...s,
          participants: [...s.participants.filter((x) => x.id !== p.id), p],
        }));
        onParticipantJoined?.(p);
      });

      room.on("participantDisconnected", (participant: any) => {
        setState((s) => ({
          ...s,
          participants: s.participants.filter((p) => p.id !== participant.identity),
        }));
        onParticipantLeft?.(participant.identity);
      });

      room.on("activeSpeakersChanged", (speakers: any[]) => {
        const speakerIds = new Set(speakers.map((s) => s.identity));
        setState((s) => ({
          ...s,
          participants: s.participants.map((p) => ({ ...p, isSpeaking: speakerIds.has(p.id) })),
          localParticipant: s.localParticipant
            ? { ...s.localParticipant, isSpeaking: speakerIds.has(s.localParticipant.id) }
            : s.localParticipant,
        }));
      });

      room.on("disconnected", () => {
        setState((s) => ({
          ...s,
          connected: false,
          connecting: false,
          participants: [],
          localParticipant: null,
        }));
        onDisconnected?.();
      });

      room.on("reconnecting", () => {
        setState((s) => ({ ...s, error: "Reconnecting..." }));
      });

      room.on("reconnected", () => {
        setState((s) => ({ ...s, error: null }));
      });

      const rawUrl = tokenResult.livekitUrl || import.meta.env.VITE_LIVEKIT_WS_URL;
      if (!rawUrl) {
        throw new Error("LiveKit WebSocket URL not configured. Set VITE_LIVEKIT_WS_URL.");
      }
      const wsUrl = rawUrl.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
      await room.connect(wsUrl, tokenResult.token);

      const localP: LiveKitParticipant = {
        id: room.localParticipant?.identity || userId,
        name: room.localParticipant?.name || "You",
        isSpeaking: false,
        isMuted: false,
        isCameraOn: true,
        isScreenSharing: false,
        isLocal: true,
        connectionQuality: "excellent",
      };

      setState((s) => ({
        ...s,
        connected: true,
        connecting: false,
        roomName,
        localParticipant: localP,
        error: null,
      }));
      onConnected?.();
    } catch (err: any) {
      setState((s) => ({
        ...s,
        connecting: false,
        error: err?.message || "Connection failed",
      }));
    }
  }, [userId, roomName, state.connected, state.connecting]);

  const disconnect = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      try {
        room.disconnect();
      } catch {
        // ignore
      }
      roomRef.current = null;
    }
    setState({
      connected: false,
      connecting: false,
      roomName: null,
      participants: [],
      localParticipant: null,
      isRecording: false,
      error: null,
    });
    onDisconnected?.();
  }, []);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;
    try {
      const enabled = room.localParticipant.isMicrophoneEnabled;
      await room.localParticipant.setMicrophoneEnabled(!enabled);
      setState((s) => ({
        ...s,
        localParticipant: s.localParticipant
          ? { ...s.localParticipant, isMuted: enabled }
          : null,
      }));
    } catch {
      setState((s) => ({
        ...s,
        localParticipant: s.localParticipant
          ? { ...s.localParticipant, isMuted: !s.localParticipant.isMuted }
          : null,
      }));
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;
    try {
      const enabled = room.localParticipant.isCameraEnabled;
      await room.localParticipant.setCameraEnabled(!enabled);
      setState((s) => ({
        ...s,
        localParticipant: s.localParticipant
          ? { ...s.localParticipant, isCameraOn: !enabled }
          : null,
      }));
    } catch {
      setState((s) => ({
        ...s,
        localParticipant: s.localParticipant
          ? { ...s.localParticipant, isCameraOn: !s.localParticipant.isCameraOn }
          : null,
      }));
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;
    try {
      const enabled = room.localParticipant.isScreenShareEnabled;
      await room.localParticipant.setScreenShareEnabled(!enabled);
      setState((s) => ({
        ...s,
        localParticipant: s.localParticipant
          ? { ...s.localParticipant, isScreenSharing: !enabled }
          : null,
      }));
    } catch {
      setState((s) => ({
        ...s,
        localParticipant: s.localParticipant
          ? { ...s.localParticipant, isScreenSharing: !s.localParticipant.isScreenSharing }
          : null,
      }));
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const { error } = await db.functions.invoke("livekit-room-token", {
        body: { action: "start_recording", roomName },
      });
      if (error) throw error;
      setState((s) => ({ ...s, isRecording: true }));
    } catch {
      setState((s) => ({ ...s, error: "Failed to start recording" }));
    }
  }, [roomName]);

  const stopRecording = useCallback(async () => {
    try {
      await db.functions.invoke("livekit-room-token", {
        body: { action: "stop_recording", roomName },
      });
    } catch {
      // continue
    }
    setState((s) => ({ ...s, isRecording: false }));
  }, [roomName]);

  useEffect(() => {
    if (autoConnect) connect();
    return () => {
      disconnect();
    };
  }, [autoConnect]);

  return {
    ...state,
    connect,
    disconnect,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    startRecording,
    stopRecording,
  };
}
