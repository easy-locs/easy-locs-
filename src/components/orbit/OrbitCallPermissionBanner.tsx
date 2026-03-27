import { AlertTriangle, Mic, Video } from "lucide-react";

type Props = {
  mic: string;
  cam: string;
  videoMode?: boolean;
  onRequestMic: () => void;
  onRequestCam: () => void;
};

export function OrbitCallPermissionBanner({ mic, cam, videoMode, onRequestMic, onRequestCam }: Props) {
  const micBlocked = mic === "denied";
  const camBlocked = videoMode && cam === "denied";

  if (!micBlocked && !camBlocked) return null;

  return (
    <div className="px-3 py-2 shrink-0 bg-destructive/10 border-b border-destructive/20">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-destructive flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          Device permissions required
        </p>

        {micBlocked && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Mic className="w-3 h-3" />
              Microphone permission is blocked
            </span>
            <button
              onClick={onRequestMic}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Retry mic
            </button>
          </div>
        )}

        {camBlocked && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Video className="w-3 h-3" />
              Camera permission is blocked
            </span>
            <button
              onClick={onRequestCam}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Retry camera
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
