import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createMerchantReview, recomputeMerchantRating } from "@/lib/reviews/reviewEngine";
import { toast } from "sonner";

export default function ReviewComposer({
  merchantId,
  orderId,
  onDone,
}: {
  merchantId: string;
  orderId?: string | null;
  onDone?: () => void;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user?.id) {
      toast.error("Please sign in first");
      return;
    }

    try {
      setSaving(true);
      await createMerchantReview({
        merchantId,
        reviewerUserId: user.id,
        rating,
        title: title.trim() || null,
        comment: comment.trim() || null,
        orderId: orderId ?? null,
      });
      await recomputeMerchantRating(merchantId);
      setTitle("");
      setComment("");
      setRating(5);
      toast.success("Review submitted");
      onDone?.();
    } catch (err: any) {
      toast.error("Could not submit review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-foreground">Leave a review</p>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            className={`w-10 h-10 rounded-xl text-lg ${
              n <= rating ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
      />

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        placeholder="Tell others about your experience..."
        className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none"
      />

      <button
        onClick={submit}
        disabled={saving}
        className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
      >
        {saving ? "Submitting..." : "Submit Review"}
      </button>
    </div>
  );
}
