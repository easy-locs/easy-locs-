import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
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
  const [sort, setSort] = useState<SortMode>("latest");

  const sorted = [...reviews].sort((a, b) => {
    switch (sort) {
      case "highest":
        return b.rating - a.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "lowest":
        return a.rating - b.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "replied":
        // Reviews with provider replies first
        const aHas = a.response ? 1 : 0;
        const bHas = b.response ? 1 : 0;
        return bHas - aHas || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default: // latest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="space-y-4">
      {/* Sort control */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{reviews.length} of {totalCount} reviews</span>
        <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <ArrowUpDown className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest first</SelectItem>
            <SelectItem value="highest">Highest rated</SelectItem>
            <SelectItem value="lowest">Lowest rated</SelectItem>
            <SelectItem value="replied">With replies</SelectItem>
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
            View all {totalCount} reviews
          </button>
        </div>
      )}
    </div>
  );
}
