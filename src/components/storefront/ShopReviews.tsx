/**
 * ShopReviews — Public review display + submission for storefront shops.
 * Shows average rating, review list, and submit form for buyers.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShopReviewsProps {
  shopId: string;
  shopOwnerId?: string;
}

function StarRating({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(i)}
          className={cn("transition-colors", interactive && "cursor-pointer hover:scale-110")}
        >
          <Star className={cn("h-4 w-4", i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
        </button>
      ))}
    </div>
  );
}

export default function ShopReviews({ shopId, shopOwnerId }: ShopReviewsProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [responseText, setResponseText] = useState<Record<string, string>>({});

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["shop-reviews", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_reviews")
        .select("*")
        .eq("shop_id", shopId)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const avgRating = reviews.length > 0
    ? Math.round(reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length * 10) / 10
    : 0;

  const hasReviewed = user && reviews.some((r: any) => r.reviewer_id === user.id);
  const isOwner = user?.id === shopOwnerId;

  const submitReview = async () => {
    if (!user) return toast.error("Please sign in to leave a review");
    if (!newComment.trim()) return toast.error("Please add a comment");
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("storefront_reviews").insert({
        shop_id: shopId,
        reviewer_id: user.id,
        reviewer_name: user.email?.split("@")[0] || "User",
        rating: newRating,
        comment: newComment.trim(),
      });
      if (error) throw error;
      setNewComment("");
      setNewRating(5);
      qc.invalidateQueries({ queryKey: ["shop-reviews", shopId] });
      toast.success("Review submitted!");
    } catch (e: any) {
      toast.error(e.message?.includes("unique") ? "You already reviewed this shop" : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const respondToReview = async (reviewId: string) => {
    const text = responseText[reviewId]?.trim();
    if (!text) return;
    await (supabase as any).from("storefront_reviews").update({
      response: text,
      responded_at: new Date().toISOString(),
    }).eq("id", reviewId);
    setResponseText(prev => ({ ...prev, [reviewId]: "" }));
    qc.invalidateQueries({ queryKey: ["shop-reviews", shopId] });
    toast.success("Response posted");
  };

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <div className="text-center">
          <p className="text-2xl font-bold">{avgRating || "–"}</p>
          <StarRating rating={Math.round(avgRating)} />
        </div>
        <p className="text-xs text-muted-foreground">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Submit form (non-owners, not yet reviewed) */}
      {user && !isOwner && !hasReviewed && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <p className="text-xs font-medium">Leave a review</p>
            <StarRating rating={newRating} onRate={setNewRating} interactive />
            <Textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Share your experience..."
              className="text-xs min-h-[60px]"
            />
            <Button size="sm" className="text-xs w-full" onClick={submitReview} disabled={submitting}>
              {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
              Submit Review
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No reviews yet</p>
      ) : (
        <div className="space-y-2">
          {reviews.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{r.reviewer_name || "User"}</span>
                  <StarRating rating={r.rating} />
                </div>
                <p className="text-xs text-muted-foreground">{r.comment}</p>
                <p className="text-[9px] text-muted-foreground/60">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>

                {/* Owner response */}
                {r.response && (
                  <div className="mt-2 pl-3 border-l-2 border-primary/30">
                    <p className="text-[10px] font-medium text-primary">Shop response</p>
                    <p className="text-xs text-muted-foreground">{r.response}</p>
                  </div>
                )}

                {/* Owner can respond */}
                {isOwner && !r.response && (
                  <div className="flex gap-1.5 mt-1">
                    <Textarea
                      value={responseText[r.id] || ""}
                      onChange={e => setResponseText(prev => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="Reply..."
                      className="text-[10px] min-h-[40px] flex-1"
                    />
                    <Button size="sm" variant="outline" className="text-[10px] h-auto self-end"
                      onClick={() => respondToReview(r.id)}>
                      Reply
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
