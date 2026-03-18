/**
 * OrbitCallBar — Call action bar for voice/video sessions.
 */
export default function OrbitCallBar({
  status,
  onVoice,
  onVideo,
  onAccept,
  onEnd,
  onDecline,
}: {
  status?: string;
  onVoice?: () => void;
  onVideo?: () => void;
  onAccept?: () => void;
  onEnd?: () => void;
  onDecline?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        {status === "ringing" ? (
          <>
            <button onClick={onAccept} className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Accept
            </button>
            <button onClick={onDecline} className="flex-1 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">
              Decline
            </button>
          </>
        ) : status === "active" ? (
          <button onClick={onEnd} className="w-full rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">
            End call
          </button>
        ) : (
          <>
            <button onClick={onVoice} className="flex-1 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
              📞 Voice
            </button>
            <button onClick={onVideo} className="flex-1 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
              🎥 Video
            </button>
          </>
        )}
      </div>
    </div>
  );
}
