import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ShieldCheck, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import ReviewCard from "./ReviewCard";
import ReviewPaywall, { useReviewAccess } from "../reviews/ReviewPaywall";

type SortMode = "latest" | "highest" | "lowest" | "replied";
type FilterMode = "all" | "verified";

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  response?: string | null;
  service_title?: string | null;
  verified?: boolean;
  created_at: string;
}

interface Props {
  reviews: Review[];
  totalCount: number;
  pageSize?: number;
}

export default function SortableReviewList({ reviews, totalCount, pageSize = 6 }: Props) {
  const { t } = useI18n();
  const { unlocked } = useReviewAccess();
  const [sort, setSort] = useState<SortMode>("latest");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  if (!unlocked) {
    return <ReviewPaywall reviewCount={totalCount} averageRating={avgRating} />;
  }

  const filtered = filter === "verified" ? reviews.filter((r) => r.verified) : reviews;

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "highest":
        return b.rating - a.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "lowest":
        return a.rating - b.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "replied": {
        const aHas = a.response ? 1 : 0;
        const bHas = b.response ? 1 : 0;
        return bHas - aHas || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const paginated = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;
  const verifiedCount = reviews.filter((r) => r.verified).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filtered.length} {t("mp.reviews_of") || "of"} {totalCount} {t("mp.reviews") || "reviews"}
          </span>
          {verifiedCount > 0 && (
            <Button
              size="sm"
              variant={filter === "verified" ? "default" : "outline"}
              className="h-7 text-xs gap-1"
              onClick={() => setFilter(filter === "verified" ? "all" : "verified")}
            >
              <ShieldCheck className="h-3 w-3" />
              {t("mp.verified_only") || "Verified only"} ({verifiedCount})
            </Button>
          )}
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <ArrowUpDown className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">{t("mp.sort_latest") || "Latest first"}</SelectItem>
            <SelectItem value="highest">{t("mp.sort_highest") || "Highest rated"}</SelectItem>
            <SelectItem value="lowest">{t("mp.sort_lowest") || "Lowest rated"}</SelectItem>
            <SelectItem value="replied">{t("mp.sort_replied") || "With replies"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paginated.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {filter === "verified"
            ? (t("mp.no_verified_reviews") || "No verified reviews yet")
            : (t("mp.no_reviews") || "No reviews yet")}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {paginated.map((review) => (
            <ReviewCard key={review.id} review={review as any} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => setVisibleCount((c) => c + pageSize)}
          >
            <ChevronDown className="h-3 w-3" />
            {t("mp.load_more_reviews") || "Show more reviews"} ({sorted.length - visibleCount} {t("mp.remaining") || "remaining"})
          </Button>
        </div>
      )}
    </div>
  );
}
