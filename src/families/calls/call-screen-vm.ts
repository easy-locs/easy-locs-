/**
 * CallScreenViewModel — Canonical view model for the full-screen call UI.
 */
import type { ActiveCall, CallPeer, CallUIState } from "@/stores/orbit/call.store";

export interface CallScreenViewModel {
  callId: string;
  peerName: string;
  peerAvatarUrl: string | null;
  peerInitials: string;
  mode: "audio" | "video";
  direction: "outgoing" | "incoming";
  uiState: CallUIState;
  statusLabel: string;
  elapsed: number;
  elapsedFormatted: string;
  muted: boolean;
  speakerOn: boolean;
  cameraOn: boolean;
  error: string | null;
  isTerminal: boolean;
  isConnecting: boolean;
  isActive: boolean;
  isIncoming: boolean;
  showAcceptDecline: boolean;
  showControls: boolean;
  showClose: boolean;
}

export function buildCallScreenVM(call: ActiveCall | null): CallScreenViewModel | null {
  if (!call) return null;

  const terminal: CallUIState[] = ["ended", "missed", "declined", "failed"];
  const connecting: CallUIState[] = ["calling", "ringing", "connecting"];

  const isTerminal = terminal.includes(call.uiState);
  const isConnecting = connecting.includes(call.uiState);
  const isActive = call.uiState === "active";
  const isIncoming = call.uiState === "incoming";

  const statusMap: Record<CallUIState, string> = {
    idle: "",
    calling: "Calling…",
    ringing: "Ringing…",
    incoming: "Incoming call",
    connecting: "Connecting…",
    active: formatElapsed(call.elapsed),
    reconnecting: "Reconnecting…",
    ended: "Call ended",
    missed: "No answer",
    declined: "Call declined",
    failed: "Call failed",
  };

  const initials = call.peer.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

  return {
    callId: call.callId,
    peerName: call.peer.name,
    peerAvatarUrl: call.peer.avatarUrl || null,
    peerInitials: initials,
    mode: call.mode,
    direction: call.direction,
    uiState: call.uiState,
    statusLabel: statusMap[call.uiState] || "",
    elapsed: call.elapsed,
    elapsedFormatted: formatElapsed(call.elapsed),
    muted: call.muted,
    speakerOn: call.speakerOn,
    cameraOn: call.cameraOn,
    error: call.error,
    isTerminal,
    isConnecting,
    isActive,
    isIncoming,
    showAcceptDecline: isIncoming,
    showControls: !isTerminal && !isIncoming,
    showClose: isTerminal,
  };
}

function formatElapsed(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
