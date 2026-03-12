/**
 * CallEventBubble — Renders call events inline in a chat thread.
 * Distinguishes audio/video, ended/missed/declined with duration.
 */
import { Phone, PhoneMissed, PhoneOff, Video } from "lucide-react";
import { format } from "date-fns";
import { parseCallEvent, cleanCallContent } from "@/lib/call-thread-logger";

interface Props {
  content: string;
  createdAt: string;
  isVideo?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function CallEventBubble({ content, createdAt, isVideo }: Props) {
  const parsed = parseCallEvent(content);
  const event = parsed?.event || "ended";
  const duration = parsed?.durationSeconds || 0;
  const displayContent = cleanCallContent(content);
  const CallIcon = isVideo ? Video : Phone;

  const config: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
    ended: {
      icon: <CallIcon className="h-3.5 w-3.5" />,
      color: "text-muted-foreground",
      bg: "bg-muted/40",
      border: "border-border/30",
    },
    missed: {
      icon: <PhoneMissed className="h-3.5 w-3.5" />,
      color: "text-destructive",
      bg: "bg-destructive/8",
      border: "border-destructive/15",
    },
    declined: {
      icon: <PhoneOff className="h-3.5 w-3.5" />,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/8",
      border: "border-amber-500/15",
    },
  };

  const { icon, color, bg, border } = config[event] || config.ended;

  return (
    <div className="flex justify-center my-3">
      <div className={`${bg} ${color} ${border} border inline-flex items-center gap-2.5 text-xs px-4 py-2.5 rounded-2xl shadow-sm`}>
        <div className="shrink-0">{icon}</div>
        <div className="flex flex-col items-start">
          <span className="font-medium leading-tight">
            {displayContent.replace(/^📞\s*/, "")}
          </span>
          {event === "ended" && duration > 0 && (
            <span className="text-[10px] opacity-60 leading-tight">{formatDuration(duration)}</span>
          )}
        </div>
        <span className="opacity-50 text-[10px] font-mono tabular-nums ml-1">
          {format(new Date(createdAt), "HH:mm")}
        </span>
      </div>
    </div>
  );
}
