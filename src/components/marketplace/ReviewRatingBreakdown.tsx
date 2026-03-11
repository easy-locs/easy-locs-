import { Star, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

interface Props {
  rating: number;
  reviewsCount: number;
  verifiedCount: number;
  reviews: { rating: number }[];
}

export default function ReviewRatingBreakdown({ rating, reviewsCount, verifiedCount, reviews }: Props) {
  const { t } = useI18n();
  if (reviewsCount === 0) return null;

  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const maxCount = Math.max(...counts.map((c) => c.count), 1);
  const reviewLabel = reviewsCount === 1
    ? (t("mp.review_single") || "review")
    : (t("mp.reviews") || "reviews");

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      {/* Big score */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <span className="text-4xl font-bold text-foreground">{rating.toFixed(1)}</span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`h-4 w-4 ${
                s <= Math.round(rating)
                  ? "text-[hsl(var(--chart-4))] fill-[hsl(var(--chart-4))]"
                  : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{reviewsCount} {reviewLabel}</span>
        {verifiedCount > 0 && (
          <Badge variant="outline" className="text-[10px] h-5 gap-0.5 bg-success/10 text-success border-success/20 mt-1">
            <ShieldCheck className="h-2.5 w-2.5" />
            {verifiedCount} {t("mp.verified_review") || "verified"}
          </Badge>
        )}
      </div>

      {/* Bar breakdown */}
      <div className="flex-1 w-full space-y-1.5">
        {counts.map(({ star, count }) => {
          const pct = (count / maxCount) * 100;
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-4 text-right">{star}</span>
              <Star className="h-3 w-3 text-[hsl(var(--chart-4))] fill-[hsl(var(--chart-4))]" />
              <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[hsl(var(--chart-4))] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-6">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
