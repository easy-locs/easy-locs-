import { Phone, PhoneOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Props = {
  visible: boolean;
  peerName?: string;
  mode?: "audio" | "video";
  onAccept: () => void;
  onDecline: () => void;
};

export function OrbitIncomingCallBar({ visible, peerName, mode, onAccept, onDecline }: Props) {
  const { t } = useI18n();
  if (!visible) return null;

  return (
    <div
      className="px-3 py-3 shrink-0 animate-in fade-in slide-in-from-top-2"
      style={{
        background: "hsl(var(--hud-success) / 0.1)",
        borderBottom: "1px solid hsl(var(--hud-success) / 0.2)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Phone className="w-5 h-5 animate-pulse shrink-0" style={{ color: "hsl(var(--hud-success))" }} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--hud-success))" }}>
              {mode === "video" ? t("orbit.call.incoming_video") : t("orbit.call.incoming_audio")}
            </p>
            <p className="text-sm font-medium truncate leading-snug" style={{ color: "hsl(var(--foreground))" }}>
              {peerName || t("orbit.call.unknown_contact")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onDecline}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 min-h-[44px]"
            style={{ background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}
          >
            <PhoneOff className="w-3.5 h-3.5" />
            {t("orbit.call.decline")}
          </button>
          <button
            onClick={onAccept}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 min-h-[44px]"
            style={{ background: "hsl(var(--hud-success))", color: "white" }}
          >
            <Phone className="w-3.5 h-3.5" />
            {t("orbit.call.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
