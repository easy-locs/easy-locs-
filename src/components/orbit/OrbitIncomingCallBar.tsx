import { Phone, PhoneOff } from "lucide-react";

type Props = {
  visible: boolean;
  peerName?: string;
  mode?: "audio" | "video";
  onAccept: () => void;
  onDecline: () => void;
};

export function OrbitIncomingCallBar({ visible, peerName, mode, onAccept, onDecline }: Props) {
  if (!visible) return null;

  return (
    <div className="px-3 py-3 shrink-0 bg-green-500/10 border-b border-green-500/20 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Phone className="w-5 h-5 text-green-500 animate-pulse shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-green-600">
              Incoming {mode === "video" ? "video" : "audio"} call
            </p>
            <p className="text-sm font-medium break-words leading-snug">{peerName || "Unknown contact"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onDecline}
            className="px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors flex items-center gap-1"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors flex items-center gap-1"
          >
            <Phone className="w-3.5 h-3.5" />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
