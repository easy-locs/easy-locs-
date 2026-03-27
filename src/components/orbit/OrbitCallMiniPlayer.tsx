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

  return (
    <div className="px-3 py-2 shrink-0 bg-green-500/10 border-b border-green-500/20">
      <div className="flex items-center justify-between">
        <button onClick={onOpen} className="flex items-center gap-2 min-w-0">
          <Phone className="w-4 h-4 text-green-500 animate-pulse shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-green-600 font-medium">
              {mode === "video" ? "Video call" : "Audio call"} · {state || "active"}
            </p>
            <p className="text-xs font-semibold truncate">{peerName || "Unknown contact"}</p>
            {muted && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-destructive">
                <MicOff className="w-2.5 h-2.5" /> Muted
              </span>
            )}
          </div>
        </button>

        <button
          onClick={onHangup}
          className="px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-medium hover:bg-destructive/90 transition-colors flex items-center gap-1"
        >
          <PhoneOff className="w-3 h-3" />
          Hang up
        </button>
      </div>
    </div>
  );
}
