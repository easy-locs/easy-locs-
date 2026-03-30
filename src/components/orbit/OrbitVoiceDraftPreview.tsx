/**
 * OrbitVoiceDraftPreview — Shows recorded voice preview before sending.
 * Reads from the composer store via hook.
 */
import { memo } from "react";
import { Ban, Send, Play, Pause, Loader2 } from "lucide-react";
import { useOrbitComposer } from "@/hooks/orbit/useOrbitComposer";
import { useOrbitAudioPlayback } from "@/hooks/orbit/useOrbitAudioPlayback";
import { haptic } from "@/lib/haptics";

interface Props {
  conversationId: string;
  onSendVoice?: () => void;
  sending?: boolean;
}

function OrbitVoiceDraftPreview({ conversationId, onSendVoice, sending = false }: Props) {
  const { voiceDraft, clearVoiceDraft } = useOrbitComposer(conversationId);
  const audio = useOrbitAudioPlayback(`voice-draft-${conversationId}`);

  if (!voiceDraft) return null;

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="px-2 py-2 flex items-center gap-2 border-t border-border bg-muted/40">
      <button
        onClick={() => {
          clearVoiceDraft();
          haptic("light");
        }}
        className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-destructive/15 text-destructive"
      >
        <Ban className="h-4 w-4" />
      </button>

      <div className="flex-1 flex items-center gap-2 rounded-2xl px-3 py-2 bg-background border border-border min-w-0">
        <button
          onClick={() => audio.togglePlayPause(voiceDraft.url)}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/15 text-primary shrink-0"
        >
          {audio.status === "playing" ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>
        <div className="flex-1 h-1 rounded-full bg-border relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
            style={{ width: `${audio.progress * 100}%` }}
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground shrink-0">
          {formatDuration(voiceDraft.durationSeconds)}
        </span>
      </div>

      <button
        onClick={() => {
          haptic("medium");
          onSendVoice?.();
        }}
        className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-md"
        disabled={sending}
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default memo(OrbitVoiceDraftPreview);
