/**
 * CallScreenViewModel — Canonical VM for the active call screen.
 */
import type { ActiveCall } from "@/stores/orbit/call.store";
import { orbitLabels } from "@/families/orbit-i18n/orbit-labels";

export interface CallScreenViewModel {
  callId: string;
  peerName: string;
  peerAvatarUrl: string | null;
  mode: "audio" | "video";
  direction: "outgoing" | "incoming";
  statusLabel: string;
  elapsedLabel: string;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isCameraOn: boolean;
  isActive: boolean;
  isConnecting: boolean;
  isRinging: boolean;
  isEnded: boolean;
  canHangup: boolean;
  canAccept: boolean;
  canToggleVideo: boolean;
}

function formatElapsed(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function toCallScreenVM(call: ActiveCall | null): CallScreenViewModel | null {
  if (!call) return null;

  const isActive = call.uiState === "active";
  const isConnecting = call.uiState === "connecting" || call.uiState === "reconnecting";
  const isRinging = call.uiState === "calling" || call.uiState === "ringing";
  const isEnded = ["ended", "missed", "declined", "failed"].includes(call.uiState);

  let statusLabel: string;
  switch (call.uiState) {
    case "calling": statusLabel = orbitLabels.call.calling; break;
    case "ringing": statusLabel = orbitLabels.call.ringing; break;
    case "incoming": statusLabel = orbitLabels.call.incoming; break;
    case "connecting": statusLabel = orbitLabels.call.connecting; break;
    case "reconnecting": statusLabel = orbitLabels.call.reconnecting; break;
    case "active": statusLabel = formatElapsed(call.elapsed); break;
    case "ended": statusLabel = orbitLabels.call.ended; break;
    case "missed": statusLabel = orbitLabels.call.missed; break;
    case "declined": statusLabel = orbitLabels.call.declined; break;
    case "failed": statusLabel = orbitLabels.call.failed; break;
    default: statusLabel = "";
  }

  return {
    callId: call.callId,
    peerName: call.peer.name,
    peerAvatarUrl: call.peer.avatarUrl ?? null,
    mode: call.mode,
    direction: call.direction,
    statusLabel,
    elapsedLabel: isActive ? formatElapsed(call.elapsed) : "",
    isMuted: call.muted,
    isSpeakerOn: call.speakerOn,
    isCameraOn: call.cameraOn,
    isActive,
    isConnecting,
    isRinging,
    isEnded,
    canHangup: !isEnded,
    canAccept: call.uiState === "incoming",
    canToggleVideo: call.mode === "video" && isActive,
  };
}
