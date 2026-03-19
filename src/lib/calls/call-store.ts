import { secureStore } from "@/lib/security-chief/native-secure-store";

export type CallUiState =
  | "idle"
  | "dialing"
  | "ringing_incoming"
  | "ringing_outgoing"
  | "connecting"
  | "active"
  | "ended"
  | "rejected"
  | "failed";

export interface PersistedCallState {
  sessionId: string | null;
  peerUserId: string | null;
  myUserId: string | null;
  callType: "audio" | "video";
  state: CallUiState;
  startedAt?: string | null;
  updatedAt: string;
}

const STORAGE_KEY = "orbit_call_state_v1";

let memoryState: PersistedCallState = {
  sessionId: null,
  peerUserId: null,
  myUserId: null,
  callType: "audio",
  state: "idle",
  startedAt: null,
  updatedAt: new Date().toISOString(),
};

const listeners = new Set<(s: PersistedCallState) => void>();

async function persist(state: PersistedCallState) {
  memoryState = state;
  await secureStore.set(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((fn) => fn(memoryState));
}

export async function loadCallState(): Promise<PersistedCallState> {
  const raw = await secureStore.get(STORAGE_KEY);
  if (!raw) return memoryState;
  try {
    memoryState = JSON.parse(raw) as PersistedCallState;
    return memoryState;
  } catch {
    return memoryState;
  }
}

export function getCallStateSync() {
  return memoryState;
}

export async function setCallState(
  patch: Partial<PersistedCallState>
): Promise<PersistedCallState> {
  const next: PersistedCallState = {
    ...memoryState,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await persist(next);
  return next;
}

export async function resetCallState() {
  const next: PersistedCallState = {
    sessionId: null,
    peerUserId: null,
    myUserId: null,
    callType: "audio",
    state: "idle",
    startedAt: null,
    updatedAt: new Date().toISOString(),
  };
  await persist(next);
}

export function subscribeCallState(fn: (s: PersistedCallState) => void) {
  listeners.add(fn);
  fn(memoryState);
  return () => { listeners.delete(fn); };
}
