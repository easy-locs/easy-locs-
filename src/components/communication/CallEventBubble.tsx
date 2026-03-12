/**
 * CallEventBubble — Renders call events (ended, missed, declined) inline in a chat thread.
 * Mobile-first, clean, centered system-style bubble.
 */
import { Phone, PhoneMissed, PhoneOff } from "lucide-react";
import { format } from "date-fns";

interface Props {
  content: string;
  createdAt: string;
  metadata?: {
    call_event?: string;
    duration_seconds?: number;
  };
}

export default function CallEventBubble({ content, createdAt, metadata }: Props) {
  const event = metadata?.call_event || "ended";

  const config: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    ended: {
      icon: <Phone className="h-3.5 w-3.5" />,
      color: "text-muted-foreground",
      bg: "bg-muted/50",
    },
    missed: {
      icon: <PhoneMissed className="h-3.5 w-3.5" />,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    declined: {
      icon: <PhoneOff className="h-3.5 w-3.5" />,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
  };

  const { icon, color, bg } = config[event] || config.ended;

  return (
    <div className="flex justify-center my-2">
      <div className={`${bg} ${color} inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full`}>
        {icon}
        <span className="font-medium">{content.replace(/^📞\s*/, "")}</span>
        <span className="opacity-60 text-[10px]">
          {format(new Date(createdAt), "HH:mm")}
        </span>
      </div>
    </div>
  );
}
