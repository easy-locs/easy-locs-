type Props = {
  onAudio: () => void;
  onVideo: () => void;
};

export function CallButtons({ onAudio, onVideo }: Props) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onAudio}
        className="rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
      >
        Audio
      </button>
      <button
        type="button"
        onClick={onVideo}
        className="rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
      >
        Video
      </button>
    </div>
  );
}
