import { Mic, MicOff, Volume2, VolumeX, Video, VideoOff, PhoneOff, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Props = {
  muted: boolean;
  speakerOn: boolean;
  cameraOn: boolean;
  isVideo: boolean;
  reconnecting?: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleCamera: () => void;
  onHangup: () => void;
};

export function OrbitCallControls({
  muted,
  speakerOn,
  cameraOn,
  isVideo,
  reconnecting,
  onToggleMute,
  onToggleSpeaker,
  onToggleCamera,
  onHangup,
}: Props) {
  const { t } = useI18n();

  return (
    <div
      className="px-4 py-3 shrink-0"
      style={{
        borderTop: "1px solid hsl(var(--border) / 0.15)",
        background: "hsl(var(--card) / 0.2)",
      }}
    >
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onToggleMute}
          className="p-3 rounded-full transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
          style={{
            background: muted ? "hsl(var(--destructive) / 0.2)" : "hsl(var(--card) / 0.5)",
            color: muted ? "hsl(var(--destructive))" : "hsl(var(--foreground))",
          }}
          title={muted ? t("orbit.call.unmute") : t("orbit.call.mute")}
        >
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={onToggleSpeaker}
          className="p-3 rounded-full transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
          style={{
            background: speakerOn ? "hsl(var(--primary) / 0.2)" : "hsl(var(--card) / 0.5)",
            color: speakerOn ? "hsl(var(--primary))" : "hsl(var(--foreground))",
          }}
          title={speakerOn ? t("orbit.call.speaker_off") : t("orbit.call.speaker_on")}
        >
          {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        {isVideo && (
          <button
            onClick={onToggleCamera}
            className="p-3 rounded-full transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
            style={{
              background: !cameraOn ? "hsl(var(--destructive) / 0.2)" : "hsl(var(--card) / 0.5)",
              color: !cameraOn ? "hsl(var(--destructive))" : "hsl(var(--foreground))",
            }}
            title={cameraOn ? t("orbit.call.camera_off") : t("orbit.call.camera_on")}
          >
            {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        )}

        <button
          onClick={onHangup}
          className="p-3 rounded-full transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
          style={{
            background: "hsl(var(--destructive))",
            color: "hsl(var(--destructive-foreground))",
          }}
          title={t("orbit.call.hangup")}
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {reconnecting && (
        <div className="flex items-center justify-center gap-1.5 mt-2 text-xs animate-pulse" style={{ color: "hsl(var(--muted-foreground))" }}>
          <Loader2 className="w-3 h-3 animate-spin" />
          {t("orbit.call.reconnecting")}
        </div>
      )}
    </div>
  );
}
