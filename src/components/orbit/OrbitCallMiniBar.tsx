import { Phone, PhoneOff } from "lucide-react";

type Props = {
  active: boolean;
  label?: string;
  onOpen?: () => void;
  onHangup?: () => void;
};

export function OrbitCallMiniBar({ active, label, onOpen, onHangup }: Props) {
  if (!active) return null;

  return (
    <div className="px-3 py-2 shrink-0 bg-green-500/10 border-b border-green-500/20">
      <div className="flex items-center justify-between">
        <button onClick={onOpen} className="flex items-center gap-2 min-w-0">
          <Phone className="w-4 h-4 text-green-500 animate-pulse shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-green-600">Active call</p>
            <p className="text-[11px] text-muted-foreground truncate">{label || "Call in progress"}</p>
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
