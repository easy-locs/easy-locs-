import { Mic, MicOff, Volume2, VolumeX, Video, VideoOff, PhoneOff, Loader2 } from "lucide-react";

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
  return (
    <div className="px-4 py-3 shrink-0 border-t border-border/30 bg-accent/20">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onToggleMute}
          className={`p-3 rounded-full transition-colors ${muted ? "bg-destructive/20 text-destructive" : "bg-muted/50 text-foreground hover:bg-muted"}`}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={onToggleSpeaker}
          className={`p-3 rounded-full transition-colors ${speakerOn ? "bg-primary/20 text-primary" : "bg-muted/50 text-foreground hover:bg-muted"}`}
          title={speakerOn ? "Speaker Off" : "Speaker On"}
        >
          {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        {isVideo && (
          <button
            onClick={onToggleCamera}
            className={`p-3 rounded-full transition-colors ${!cameraOn ? "bg-destructive/20 text-destructive" : "bg-muted/50 text-foreground hover:bg-muted"}`}
            title={cameraOn ? "Camera Off" : "Camera On"}
          >
            {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        )}

        <button
          onClick={onHangup}
          className="p-3 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          title="Hang up"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {reconnecting && (
        <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-muted-foreground animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          Reconnecting...
        </div>
      )}
    </div>
  );
}
