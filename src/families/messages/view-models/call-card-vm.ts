/**
 * CallCardViewModel — Canonical VM for call cards in threads.
 */
import type { CanonicalMessageEnvelope } from "../canonical-envelope";
import { orbitLabels } from "@/families/orbit-i18n/orbit-labels";

export interface CallCardViewModel {
  id: string;
  mode: "audio" | "video";
  direction: "incoming" | "outgoing";
  status: string;
  statusLabel: string;
  durationLabel: string | null;
  timestamp: string;
  callbackEnabled: boolean;
  isMissed: boolean;
  isDeclined: boolean;
  icon: "phone-incoming" | "phone-outgoing" | "phone-missed" | "phone-off" | "video";
}

export function toCallCardVM(envelope: CanonicalMessageEnvelope): CallCardViewModel {
  const call = envelope.metadata.call;
  const timing = envelope.metadata.timing;
  const mode = call?.mode ?? "audio";
  const direction = call?.direction ?? "outgoing";
  const status = call?.status ?? "ended";
  const isMissed = envelope.type === "call_missed" || status === "missed";
  const isDeclined = envelope.type === "call_declined" || status === "declined";

  let durationLabel: string | null = null;
  if (timing?.durationSeconds && timing.durationSeconds > 0) {
    const m = Math.floor(timing.durationSeconds / 60);
    const s = timing.durationSeconds % 60;
    durationLabel = `${m}:${s.toString().padStart(2, "0")}`;
  }

  let statusLabel: string;
  if (isMissed) statusLabel = orbitLabels.call.missed;
  else if (isDeclined) statusLabel = orbitLabels.call.declined;
  else if (status === "ended") statusLabel = orbitLabels.call.ended;
  else statusLabel = status;

  let icon: CallCardViewModel["icon"];
  if (isMissed) icon = "phone-missed";
  else if (isDeclined) icon = "phone-off";
  else if (mode === "video") icon = "video";
  else if (direction === "incoming") icon = "phone-incoming";
  else icon = "phone-outgoing";

  return {
    id: envelope.id,
    mode,
    direction,
    status,
    statusLabel,
    durationLabel,
    timestamp: envelope.createdAt,
    callbackEnabled: call?.callbackEnabled ?? false,
    isMissed,
    isDeclined,
    icon,
  };
}
