/**
 * ComposerVoicePreview — Single-purpose: playback preview of recorded voice before send.
 */
import { memo } from "react";
import { Ban, Send, Play, Pause, Loader2 } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { DeviceAudio } from "@/families/device/device-audio";

interface Props {
  voicePreview: { blob: Blob; duration: number; url: string };
  uploading?: boolean;
  disabled?: boolean;
  onDiscard: () => void;
  onSend: () => void;
}

function formatDuration(seconds: number) {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function ComposerVoicePreview({ voicePreview, uploading, disabled, onDiscard, onSend }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => { onDiscard(); haptic("light"); }}
        className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-destructive/15 text-destructive active:scale-90 transition-transform"
      >
        <Ban className="h-4 w-4" />
      </button>
      <div className="flex-1 flex items-center gap-2 rounded-2xl px-3 py-2 bg-background border border-border min-w-0">
        <button
          onClick={() => DeviceAudio.playFile(voicePreview.url)}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/15 text-primary shrink-0 active:scale-90 transition-transform"
        >
          <Play className="h-4 w-4" />
        </button>
        <div className="flex-1 h-1 rounded-full bg-border" />
        <span className="text-xs font-mono text-muted-foreground shrink-0">{formatDuration(voicePreview.duration)}</span>
      </div>
      <button
        onClick={() => { haptic("medium"); onSend(); }}
        className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-md active:scale-90 transition-transform"
        disabled={uploading || disabled}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default memo(ComposerVoicePreview);
