import { useState } from "react";
import { StarRating } from "./StarRating";
import { Send, AlertTriangle } from "lucide-react";
import { moderateReviewContent } from "@/lib/social/review-moderation";
import { toast } from "sonner";

interface ReviewFormProps {
  onSubmit: (data: { rating: number; comment: string }) => Promise<void>;
  targetLabel?: string;
}

export function ReviewForm({ onSubmit, targetLabel }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    const modResult = moderateReviewContent(comment);
    if (modResult.blocked) {
      toast.error(modResult.reason ?? "Your review contains inappropriate content");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ rating, comment: modResult.cleanedText });
      setRating(0);
      setComment("");
      toast.success("Review submitted!");
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/15 bg-card/60 p-4 space-y-3">
      <p className="text-xs font-bold text-foreground">
        {targetLabel ? `Rate ${targetLabel}` : "Leave a review"}
      </p>

      <StarRating value={rating} onChange={setRating} size={28} />

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience..."
        rows={3}
        maxLength={1000}
        className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none placeholder:text-muted-foreground/50"
      />

      <div className="flex items-center justify-between">
        <span className="text-[0.625rem] text-muted-foreground">{comment.length}/1000</span>
        <button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          {submitting ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Submit
        </button>
      </div>
    </div>
  );
}
