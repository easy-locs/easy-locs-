/**
 * OrbitCallMiniPlayer — WhatsApp-style compact green bar shown in chat during active call.
 * Shows: mute icon | call type + peer name | hangup button
 */
import { Phone, PhoneOff, MicOff } from "lucide-react";

type Props = {
  visible: boolean;
  peerName?: string;
  state?: string;
  mode?: "audio" | "video";
  muted?: boolean;
  onOpen?: () => void;
  onHangup?: () => void;
};

export function OrbitCallMiniPlayer({ visible, peerName, state, mode, muted, onOpen, onHangup }: Props) {
  if (!visible) return null;

  const stateLabel = state || "Calling";
  const truncatedName = peerName && peerName.length > 16
    ? peerName.slice(0, 16) + "…"
    : (peerName || "Unknown");

  return (
    <div
      className="shrink-0 flex items-center justify-between px-3 py-2"
      style={{ background: "hsl(142 70% 45%)" }}
    >
      {/* Left: mute icon */}
      <button
        onClick={onOpen}
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: "hsl(0 0% 100% / 0.15)" }}
      >
        {muted ? (
          <MicOff className="w-4 h-4" style={{ color: "white" }} />
        ) : (
          <Phone className="w-4 h-4" style={{ color: "white" }} />
        )}
      </button>

      {/* Center: call info */}
      <button onClick={onOpen} className="flex-1 mx-3 text-left min-w-0">
        <div className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: "white" }} />
          <span className="text-xs font-semibold truncate" style={{ color: "white" }}>
            {truncatedName} - {stateLabel}
          </span>
        </div>
      </button>

      {/* Right: hangup */}
      <button
        onClick={onHangup}
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: "hsl(0 72% 51%)" }}
      >
        <PhoneOff className="w-4 h-4" style={{ color: "white" }} />
      </button>
    </div>
  );
}
