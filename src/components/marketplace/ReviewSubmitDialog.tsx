import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star, Send } from "lucide-react";
import { checkBookingStatus, checkExistingReview, insertReview } from "@/repositories/marketplace.repository";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking: {
    id: string;
    service_id: string;
    provider_id: string;
    booker_name?: string;
    booker_email?: string;
    service_title?: string;
  };
  onSubmitted?: () => void;
}

export default function ReviewSubmitDialog({ open, onOpenChange, booking, onSubmitted }: Props) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState(booking.booker_name || "");
  const [submitting, setSubmitting] = useState(false);

  const ratingLabels = [
    t("mp.review_tap_to_rate") || "Tap to rate",
    t("mp.review_poor") || "Poor",
    t("mp.review_fair") || "Fair",
    t("mp.review_good") || "Good",
    t("mp.review_very_good") || "Very Good",
    t("mp.review_excellent") || "Excellent",
  ];

  const handleSubmit = async () => {
    if (rating === 0) { toast.error(t("mp.review_select_rating") || "Please select a rating"); return; }
    if (!comment.trim()) { toast.error(t("mp.review_write_comment") || "Please write a comment"); return; }
    if (!reviewerName.trim()) { toast.error(t("mp.review_enter_name") || "Please enter your name"); return; }

    setSubmitting(true);

    const bookingCheck = await checkBookingStatus(booking.id);
    if (!bookingCheck || bookingCheck.status !== "completed") {
      toast.error(t("mp.review_booking_not_eligible") || "This booking is no longer eligible for review");
      setSubmitting(false);
      return;
    }

    const existing = await checkExistingReview(booking.id);
    if (existing) {
      toast.error(t("mp.review_already_submitted") || "You have already reviewed this booking");
      setSubmitting(false);
      return;
    }

    try {
      await insertReview({
        provider_id: booking.provider_id,
        service_id: booking.service_id,
        booking_id: booking.id,
        reviewer_name: reviewerName.trim(),
        reviewer_email: booking.booker_email || null,
        reviewer_user_id: user?.id || null,
        rating,
        comment: comment.trim(),
        status: "published",
        verified: true,
      });
      toast.success(t("mp.review_submitted") || "Thank you for your review!");
      onOpenChange(false);
      onSubmitted?.();
    } catch (error: any) {
      if (error?.code === "23505") {
        toast.error(t("mp.review_already_submitted") || "You have already reviewed this booking");
      } else {
        toast.error(error?.message || "Failed to submit review");
      }
    }
    setSubmitting(false);
  };

  const displayRating = hoverRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-[hsl(var(--chart-4))]" />
            {t("mp.leave_review") || "Leave a Review"}
          </DialogTitle>
          <DialogDescription>
            {booking.service_title
              ? `${t("mp.review_placeholder")?.split("...")[0] || "Share your experience with"} "${booking.service_title}"`
              : t("mp.review_placeholder") || "Tell others about your experience..."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Star rating */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  className="p-0.5 transition-transform hover:scale-110"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      s <= displayRating
                        ? "text-[hsl(var(--chart-4))] fill-[hsl(var(--chart-4))]"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {ratingLabels[displayRating] || ratingLabels[0]}
            </span>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">{t("mp.review_your_name") || "Your name"}</label>
            <Input
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="John D."
            />
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">{t("mp.review_your_comment") || "Your review"}</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("mp.review_placeholder") || "Tell others about your experience..."}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{comment.length}/1000</p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? (t("mp.review_submitting") || "Submitting...") : (t("mp.review_submit") || "Submit Review")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
