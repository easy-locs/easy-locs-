import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState(booking.booker_name || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Please select a rating"); return; }
    if (!comment.trim()) { toast.error("Please write a comment"); return; }
    if (!reviewerName.trim()) { toast.error("Please enter your name"); return; }

    setSubmitting(true);

    // Check if already reviewed (client-side guard + DB unique constraint)
    const { data: existing } = await supabase
      .from("marketplace_reviews")
      .select("id")
      .eq("booking_id", booking.id)
      .maybeSingle();

    if (existing) {
      toast.error("You have already reviewed this booking");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("marketplace_reviews").insert({
      provider_id: booking.provider_id,
      service_id: booking.service_id,
      booking_id: booking.id,
      reviewer_name: reviewerName.trim(),
      reviewer_email: booking.booker_email || null,
      reviewer_user_id: user?.id || null,
      rating,
      comment: comment.trim(),
      status: "published",
      verified: true, // linked to a real completed booking
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("You have already reviewed this booking");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Thank you for your review!");
      onOpenChange(false);
      onSubmitted?.();
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
            Leave a Review
          </DialogTitle>
          <DialogDescription>
            {booking.service_title
              ? `Share your experience with "${booking.service_title}"`
              : "Share your experience with this service"}
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
              {displayRating === 0 ? "Tap to rate" :
               displayRating === 1 ? "Poor" :
               displayRating === 2 ? "Fair" :
               displayRating === 3 ? "Good" :
               displayRating === 4 ? "Very Good" : "Excellent"}
            </span>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Your name</label>
            <Input
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="John D."
            />
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Your review</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about your experience..."
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
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
