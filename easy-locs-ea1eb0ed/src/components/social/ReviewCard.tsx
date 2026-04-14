import { StarRating } from "./StarRating";
import { MessageSquare, Flag, ThumbsUp } from "lucide-react";

interface ReviewCardProps {
  reviewerName: string;
  rating: number;
  comment?: string | null;
  date: string;
  verified?: boolean;
  merchantReply?: string | null;
  repliedAt?: string | null;
  onFlag?: () => void;
  onHelpful?: () => void;
}

export function ReviewCard({
  reviewerName,
  rating,
  comment,
  date,
  verified,
  merchantReply,
  repliedAt,
  onFlag,
  onHelpful,
}: ReviewCardProps) {
  const formattedDate = (() => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      const diff = Date.now() - d.getTime();
      if (diff < 86_400_000) return "Today";
      if (diff < 172_800_000) return "Yesterday";
      if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
      return d.toLocaleDateString();
    } catch {
      return "";
    }
  })();

  return (
    <div className="rounded-xl border border-border/10 bg-card/60 p-4 space-y-2.5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {reviewerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">{reviewerName}</span>
              {verified && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">Verified</span>
              )}
            </div>
            <StarRating value={rating} size={12} readOnly />
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
      </div>

      {comment && (
        <p className="text-[13px] text-muted-foreground leading-relaxed">{comment}</p>
      )}

      {merchantReply && (
        <div className="ml-4 pl-3 border-l-2 border-primary/20 space-y-1">
          <p className="text-[10px] font-bold text-primary flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Business Reply
          </p>
          <p className="text-[12px] text-muted-foreground">{merchantReply}</p>
          {repliedAt && (
            <p className="text-[9px] text-muted-foreground/60">
              {(() => { try { return new Date(repliedAt).toLocaleDateString(); } catch { return ""; } })()}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {onHelpful && (
          <button
            onClick={onHelpful}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ThumbsUp className="w-3 h-3" /> Helpful
          </button>
        )}
        {onFlag && (
          <button
            onClick={onFlag}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
          >
            <Flag className="w-3 h-3" /> Report
          </button>
        )}
      </div>
    </div>
  );
}
