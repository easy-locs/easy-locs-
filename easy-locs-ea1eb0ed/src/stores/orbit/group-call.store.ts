import { create } from "zustand";
import type {
  GroupCallParticipant,
  GroupCallStatus,
  GroupCallRoom,
} from "@/lib/call/group-call-types";
import { MAX_GROUP_PARTICIPANTS } from "@/lib/call/group-call-types";

interface GroupCallStoreState {
  room: GroupCallRoom | null;
  localStream: MediaStream | null;
  isScreenSharing: boolean;
  isMuted: boolean;
  isCameraOn: boolean;

  createRoom: (params: {
    roomId: string;
    roomName: string;
    createdBy: string;
    mode: "audio" | "video";
  }) => void;
  setStatus: (status: GroupCallStatus) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  addParticipant: (participant: GroupCallParticipant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipantStream: (userId: string, stream: MediaStream) => void;
  updateParticipantState: (
    userId: string,
    updates: Partial<GroupCallParticipant>
  ) => void;
  setElapsed: (elapsed: number) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setScreenSharing: (sharing: boolean) => void;
  setRecording: (recording: boolean) => void;
  reset: () => void;
}

export const useGroupCallStore = create<GroupCallStoreState>((set, get) => ({
  room: null,
  localStream: null,
  isScreenSharing: false,
  isMuted: false,
  isCameraOn: false,

  createRoom: (params) =>
    set({
      room: {
        roomId: params.roomId,
        roomName: params.roomName,
        createdBy: params.createdBy,
        maxParticipants: MAX_GROUP_PARTICIPANTS,
        participants: [],
        status: "creating",
        mode: params.mode,
        startedAt: Date.now(),
        elapsed: 0,
        isRecording: false,
      },
      isCameraOn: params.mode === "video",
      isMuted: false,
      isScreenSharing: false,
    }),

  setStatus: (status) => {
    const room = get().room;
    if (room) set({ room: { ...room, status } });
  },

  setLocalStream: (stream) => set({ localStream: stream }),

  addParticipant: (participant) => {
    const room = get().room;
    if (!room) return;
    if (room.participants.length >= room.maxParticipants - 1) return;
    if (room.participants.some((p) => p.userId === participant.userId)) return;
    set({ room: { ...room, participants: [...room.participants, participant] } });
  },

  removeParticipant: (userId) => {
    const room = get().room;
    if (!room) return;
    set({
      room: {
        ...room,
        participants: room.participants.filter((p) => p.userId !== userId),
      },
    });
  },

  updateParticipantStream: (userId, stream) => {
    const room = get().room;
    if (!room) return;
    set({
      room: {
        ...room,
        participants: room.participants.map((p) =>
          p.userId === userId ? { ...p, stream } : p
        ),
      },
    });
  },

  updateParticipantState: (userId, updates) => {
    const room = get().room;
    if (!room) return;
    set({
      room: {
        ...room,
        participants: room.participants.map((p) =>
          p.userId === userId ? { ...p, ...updates } : p
        ),
      },
    });
  },

  setElapsed: (elapsed) => {
    const room = get().room;
    if (room) set({ room: { ...room, elapsed } });
  },

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleCamera: () => set((s) => ({ isCameraOn: !s.isCameraOn })),
  setScreenSharing: (sharing) => set({ isScreenSharing: sharing }),

  setRecording: (recording) => {
    const room = get().room;
    if (room) set({ room: { ...room, isRecording: recording } });
  },

  reset: () =>
    set({
      room: null,
      localStream: null,
      isScreenSharing: false,
      isMuted: false,
      isCameraOn: false,
    }),
}));
