import { useEffect, useState } from "react";
import { usePropertyDetailStore } from "@/stores/propertyDetailStore";
import { useReviewsStore } from "@/stores/reviewsStore";

export function ReviewPanel() {
  const listing = usePropertyDetailStore((s) => s.selectedListing);
  const hydrateListingReviews = useReviewsStore((s) => s.hydrateListingReviews);
  const createReview = useReviewsStore((s) => s.createReview);
  const getListingReviews = useReviewsStore((s) => s.getListingReviews);
  const getListingAverage = useReviewsStore((s) => s.getListingAverage);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!listing) return;
    void hydrateListingReviews(listing.id);
  }, [listing?.id, hydrateListingReviews]);

  if (!listing) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground">Reviews</h3>
        <p className="text-xs text-muted-foreground mt-2">No listing selected</p>
      </div>
    );
  }

  const reviews = getListingReviews(listing.id);
  const avg = getListingAverage(listing.id);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Reviews</h3>
      <p className="text-xs text-muted-foreground">Average: {avg.toFixed(1)} / 5</p>

      <div className="flex gap-2 items-end">
        <input
          type="number"
          min={1}
          max={5}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        />
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comment"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        />
        <button
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          onClick={() =>
            void createReview({
              listingId: listing.id,
              ownerOrbitId: listing.ownerOrbitId,
              rating,
              comment,
            }).then(() => setComment(""))
          }
        >
          Review
        </button>
      </div>

      <div className="space-y-2">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-lg border border-border bg-card p-3 space-y-1">
            <p className="text-sm font-medium text-foreground">{review.rating} / 5</p>
            <p className="text-xs text-muted-foreground">{review.comment}</p>
            <p className="text-[10px] text-muted-foreground">{review.created_at}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
