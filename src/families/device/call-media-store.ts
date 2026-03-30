/**
 * call-media-store — Canonical state machine for ALL call device/media states.
 * Single source of truth. No other module may hold mic/output/camera/stream state.
 *
 * Taxonomies:
 *   MicState:    idle | acquiring | active | muted | failed | released
 *   OutputState: earpiece | speaker | bluetooth | headphones | unknown
 *   CameraState: idle | acquiring | active | off | failed | released
 *   StreamState: none | attaching | attached | detached | failed
 *   CallMediaState: idle | acquiring | ready | active | reconnecting | releasing | released | failed
 */
import { create } from "zustand";

// ── Canonical Taxonomies ──
export type MicState = "idle" | "acquiring" | "active" | "muted" | "failed" | "released";
export type OutputState = "earpiece" | "speaker" | "bluetooth" | "headphones" | "unknown";
export type CameraState = "idle" | "acquiring" | "active" | "off" | "failed" | "released";
export type StreamState = "none" | "attaching" | "attached" | "detached" | "failed";
export type CallMediaState = "idle" | "acquiring" | "ready" | "active" | "reconnecting" | "releasing" | "released" | "failed";

export interface CallMediaStoreState {
  // ── Micro states ──
  mic: MicState;
  output: OutputState;
  camera: CameraState;

  // ── Stream states ──
  localStream: StreamState;
  remoteStream: StreamState;

  // ── Global call media state ──
  callMedia: CallMediaState;

  // ── Stream refs (held here for cleanup) ──
  _localStreamRef: MediaStream | null;
  _remoteStreamRef: MediaStream | null;

  // ── Error tracking ──
  lastError: string | null;

  // ── Actions ──
  setMic: (state: MicState) => void;
  setOutput: (state: OutputState) => void;
  setCamera: (state: CameraState) => void;
  setLocalStream: (state: StreamState, stream?: MediaStream | null) => void;
  setRemoteStream: (state: StreamState, stream?: MediaStream | null) => void;
  setCallMedia: (state: CallMediaState) => void;
  setError: (error: string | null) => void;

  /** Full reset — call on hangup/cleanup */
  reset: () => void;
}

const INITIAL: Pick<CallMediaStoreState,
  "mic" | "output" | "camera" | "localStream" | "remoteStream" |
  "callMedia" | "_localStreamRef" | "_remoteStreamRef" | "lastError"
> = {
  mic: "idle",
  output: "earpiece",
  camera: "idle",
  localStream: "none",
  remoteStream: "none",
  callMedia: "idle",
  _localStreamRef: null,
  _remoteStreamRef: null,
  lastError: null,
};

export const useCallMediaStore = create<CallMediaStoreState>((set) => ({
  ...INITIAL,

  setMic: (mic) => set({ mic }),
  setOutput: (output) => set({ output }),
  setCamera: (camera) => set({ camera }),

  setLocalStream: (localStream, stream) => set((s) => ({
    localStream,
    _localStreamRef: stream !== undefined ? stream : s._localStreamRef,
  })),

  setRemoteStream: (remoteStream, stream) => set((s) => ({
    remoteStream,
    _remoteStreamRef: stream !== undefined ? stream : s._remoteStreamRef,
  })),

  setCallMedia: (callMedia) => set({ callMedia }),
  setError: (lastError) => set({ lastError }),

  reset: () => set({ ...INITIAL }),
}));
