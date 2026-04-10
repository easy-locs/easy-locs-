/**
 * voice.machine — State machine for voice recording lifecycle.
 * Enforces strict transitions: no recorder zombie, no double stop.
 */

export type VoiceRecordState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "stopping"
  | "previewing"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

const VALID_TRANSITIONS: Record<VoiceRecordState, VoiceRecordState[]> = {
  idle: ["requesting_permission"],
  requesting_permission: ["recording", "failed", "idle"],
  recording: ["stopping", "cancelled"],
  stopping: ["previewing", "failed"],
  previewing: ["sending", "cancelled", "idle"],
  sending: ["sent", "failed"],
  sent: ["idle"],
  failed: ["idle", "requesting_permission"],
  cancelled: ["idle"],
};

export function canTransitionVoice(from: VoiceRecordState, to: VoiceRecordState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertVoiceTransition(from: VoiceRecordState, to: VoiceRecordState): void {
  if (!canTransitionVoice(from, to)) {
    throw new Error(`Invalid voice state transition: ${from} → ${to}`);
  }
}

export function isVoiceTerminal(state: VoiceRecordState): boolean {
  return state === "sent" || state === "cancelled";
}

export function isVoiceActive(state: VoiceRecordState): boolean {
  return state === "recording" || state === "stopping" || state === "previewing" || state === "sending";
}
