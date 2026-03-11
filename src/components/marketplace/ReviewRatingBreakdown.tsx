import { Star } from "lucide-react";

interface Props {
  rating: number;
  reviewsCount: number;
  /** Array of ratings [1-5] for breakdown calculation */
  reviews: { rating: number }[];
}

export default function ReviewRatingBreakdown({ rating, reviewsCount, reviews }: Props) {
  if (reviewsCount === 0) return null;

  // Count per star level
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const maxCount = Math.max(...counts.map((c) => c.count), 1);

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      {/* Big score */}
      <div className="flex flex-col items-center gap-1 shrink-0">
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
        <span className="text-xs text-muted-foreground">{reviewsCount} review{reviewsCount !== 1 ? "s" : ""}</span>
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
