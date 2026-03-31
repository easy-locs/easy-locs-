/**
 * ComposerVoiceRecording — Single-purpose: active recording UI (cancel + timer + stop).
 */
import { memo } from "react";
import { Ban, Check } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { orbitLabels } from "@/families/orbit-i18n/orbit-labels";

interface Props {
  duration: number;
  onCancel: () => void;
  onStop: () => Promise<any>;
}

function formatDuration(seconds: number) {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function ComposerVoiceRecording({ duration, onCancel, onStop }: Props) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => { onCancel(); haptic("light"); }}
        className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-destructive/15 text-destructive active:scale-90 transition-transform"
      >
        <Ban className="h-4 w-4" />
      </button>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="h-2.5 w-2.5 rounded-full animate-pulse bg-destructive" />
        <span className="text-sm font-mono tabular-nums text-foreground">{formatDuration(duration)}</span>
        <span className="text-[11px] text-muted-foreground truncate">{orbitLabels.composer.slideToCancel}</span>
      </div>
      <button
        onClick={async () => { haptic("medium"); await onStop(); }}
        className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-md active:scale-90 transition-transform"
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  );
}

export default memo(ComposerVoiceRecording);
