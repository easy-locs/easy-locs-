import { Phone, Video } from "lucide-react";

type Props = {
  body: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  onCallBack?: () => void;
};

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CallMessageBubble({ body, metadata, createdAt, onCallBack }: Props) {
  const isVideo = metadata?.callType === "video";
  const status = metadata?.status as string | undefined;
  const duration = formatDuration(metadata?.durationSec as number | undefined);

  return (
    <div className="flex justify-center my-2">
      <div className="bg-muted/40 rounded-xl px-4 py-3 max-w-[280px] w-full space-y-1.5">
        <div className="flex items-center gap-2">
          {isVideo ? (
            <Video className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <p className="text-sm font-medium text-foreground">{body}</p>
        </div>

        <p className="text-xs text-muted-foreground">
          {status === "ended" && duration ? `Duration ${duration}` : status}
        </p>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">
            {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>

          {onCallBack && (
            <button
              onClick={onCallBack}
              className="text-xs font-medium text-primary hover:underline active:scale-[0.97] transition-transform"
            >
              Call back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
