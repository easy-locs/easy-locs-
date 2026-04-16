import { StarRating } from "./StarRating";
import { Star } from "lucide-react";

interface ReviewSummaryProps {
  averageRating: number;
  totalReviews: number;
  distribution?: Record<number, number>;
}

export function ReviewSummary({ averageRating, totalReviews, distribution }: ReviewSummaryProps) {
  const dist = distribution ?? {};

  return (
    <div className="rounded-2xl border border-border/15 bg-card/60 p-4">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-extrabold text-foreground tabular-nums">
            {totalReviews > 0 ? averageRating.toFixed(1) : "—"}
          </p>
          <StarRating value={Math.round(averageRating)} size={14} readOnly />
          <p className="text-[0.625rem] text-muted-foreground mt-1">{totalReviews} review{totalReviews !== 1 ? "s" : ""}</p>
        </div>

        {totalReviews > 0 && (
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = dist[star] ?? 0;
              const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[0.625rem] text-muted-foreground w-3 text-right">{star}</span>
                  <Star className="w-2.5 h-2.5 text-amber-500" fill="hsl(var(--accent))" />
                  <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[0.5625rem] text-muted-foreground w-4">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
