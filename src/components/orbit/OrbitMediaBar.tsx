import { Image, Camera, Paperclip, Mic } from "lucide-react";

type Props = {
  attachmentCount: number;
  recording: boolean;
  onOpenGallery?: () => void;
  onOpenCamera?: () => void;
  onOpenFiles?: () => void;
  onStartVoice?: () => void;
};

export function OrbitMediaBar({
  attachmentCount,
  recording,
  onOpenGallery,
  onOpenCamera,
  onOpenFiles,
  onStartVoice,
}: Props) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/20 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onOpenGallery} className="p-1.5 rounded-full hover:bg-muted/50 transition-colors" title="Gallery">
          <Image className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={onOpenCamera} className="p-1.5 rounded-full hover:bg-muted/50 transition-colors" title="Camera">
          <Camera className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={onOpenFiles} className="p-1.5 rounded-full hover:bg-muted/50 transition-colors" title="Files">
          <Paperclip className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {attachmentCount > 0 && (
          <span className="text-[11px] text-muted-foreground font-medium">
            {attachmentCount} attachment{attachmentCount > 1 ? "s" : ""}
          </span>
        )}
        <button
          onClick={onStartVoice}
          className={`p-1.5 rounded-full transition-colors ${recording ? "bg-destructive/20 text-destructive" : "hover:bg-muted/50 text-muted-foreground"}`}
          title={recording ? "Recording..." : "Voice"}
        >
          <Mic className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
