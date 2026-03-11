import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import ReviewCard from "./ReviewCard";

type SortMode = "latest" | "highest" | "lowest" | "replied";

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
  onLoadMore?: () => void;
}

export default function SortableReviewList({ reviews, totalCount, onLoadMore }: Props) {
  const { t } = useI18n();
  const [sort, setSort] = useState<SortMode>("latest");

  const sorted = [...reviews].sort((a, b) => {
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

  return (
    <div className="space-y-4">
      {/* Sort control */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {reviews.length} {t("mp.reviews_of") || "of"} {totalCount} {t("mp.reviews") || "reviews"}
        </span>
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

      {/* Review cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sorted.map((review) => (
          <ReviewCard key={review.id} review={review as any} />
        ))}
      </div>

      {/* Load more */}
      {totalCount > reviews.length && onLoadMore && (
        <div className="text-center pt-2">
          <button
            onClick={onLoadMore}
            className="text-xs text-accent hover:underline font-medium"
          >
            {t("mp.view_all_reviews") || "View all"} {totalCount} {t("mp.reviews") || "reviews"}
          </button>
        </div>
      )}
    </div>
  );
}
