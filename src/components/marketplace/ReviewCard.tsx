import { Star } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ReviewCardProps {
  review: {
    id: string;
    reviewer_name: string;
    reviewer_avatar?: string;
    rating: number;
    comment: string;
    service_title?: string;
    created_at: string;
  };
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(review.rating));

  return (
    <div className="p-4 bg-muted/20 rounded-xl border border-border/40 space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          {review.reviewer_avatar ? (
            <img src={review.reviewer_avatar} alt={review.reviewer_name} className="h-full w-full object-cover" />
          ) : (
            <AvatarFallback className="text-xs bg-accent/10 text-accent font-semibold">
              {review.reviewer_name?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">{review.reviewer_name}</span>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {formatDate(review.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-0.5 mt-0.5">
            {stars.map((filled, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  filled
                    ? "text-[hsl(var(--chart-4))] fill-[hsl(var(--chart-4))]"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
      {review.service_title && (
        <span className="inline-block text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
          📌 {review.service_title}
        </span>
      )}
    </div>
  );
}

function formatDate(d: string): string {
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return d;
  }
}
