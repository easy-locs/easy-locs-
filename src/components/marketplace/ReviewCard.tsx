import { Star, Reply, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

interface ReviewCardProps {
  review: {
    id: string;
    reviewer_name: string;
    reviewer_avatar?: string;
    rating: number;
    comment: string;
    response?: string | null;
    service_title?: string;
    created_at: string;
    verified?: boolean;
  };
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const { t } = useI18n();
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(review.rating));

  return (
    <div className="p-3 sm:p-4 bg-muted/20 rounded-xl border border-border/40 space-y-2.5 sm:space-y-3 overflow-hidden">
      <div className="flex items-start gap-3 min-w-0">
        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
          {review.reviewer_avatar ? (
            <img src={review.reviewer_avatar} alt={review.reviewer_name} className="h-full w-full object-cover" />
          ) : (
            <AvatarFallback className="text-xs bg-accent/10 text-accent font-semibold">
              {review.reviewer_name?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="text-sm font-semibold text-foreground break-words">{review.reviewer_name}</span>
              {review.verified && (
                <Badge variant="secondary" className="text-[10px] h-4 gap-0.5 px-1.5 bg-success/10 text-success border-success/20">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  {t("mp.verified_review") || "Verified"}
                </Badge>
              )}
            </div>
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
      <p className="text-sm text-muted-foreground leading-relaxed break-words">{review.comment}</p>

      {/* Provider reply */}
      {review.response && (
        <div className="ms-4 ps-3 border-s-2 border-accent/30 space-y-1">
          <div className="flex items-center gap-1.5">
            <Reply className="h-3 w-3 text-accent" />
            <span className="text-xs font-semibold text-accent">{t("mp.provider_reply") || "Provider reply"}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed break-words">{review.response}</p>
        </div>
      )}

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
