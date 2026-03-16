/**
 * StorefrontReviews — Buyer reviews with verified badge, seller responses, moderation, aggregate scores.
 * Props: shopId, mode ("seller" | "buyer")
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Star, ShieldCheck, MessageSquare, ThumbsUp, Flag, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode?: "seller" | "buyer";
}

const STARS = [1, 2, 3, 4, 5];

export default function StorefrontReviews({ shopId, mode = "buyer" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["storefront-reviews", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_product_reviews")
        .select("*")
        .eq("shop_id", shopId)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!shopId,
  });

  // Aggregate stats
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / totalReviews).toFixed(1)
    : "0.0";
  const distribution = STARS.map(s => ({
    star: s,
    count: reviews.filter((r: any) => r.rating === s).length,
    pct: totalReviews > 0 ? Math.round((reviews.filter((r: any) => r.rating === s).length / totalReviews) * 100) : 0,
  })).reverse();

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const { error } = await (supabase as any).from("storefront_product_reviews").insert({
        shop_id: shopId,
        reviewer_id: user.id,
        reviewer_name: user.email?.split("@")[0] || "Buyer",
        rating,
        comment: comment.trim() || null,
        status: "published",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review submitted!");
      setComment("");
      setRating(5);
      qc.invalidateQueries({ queryKey: ["storefront-reviews", shopId] });
    },
    onError: () => toast.error("Failed to submit review"),
  });

  const respondToReview = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      const { error } = await (supabase as any)
        .from("storefront_product_reviews")
        .update({ seller_response: response, responded_at: new Date().toISOString() })
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Response posted");
      setResponseText({});
      qc.invalidateQueries({ queryKey: ["storefront-reviews", shopId] });
    },
  });

  const moderateReview = useMutation({
    mutationFn: async ({ reviewId, status }: { reviewId: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("storefront_product_reviews")
        .update({ status })
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review moderated");
      qc.invalidateQueries({ queryKey: ["storefront-reviews", shopId] });
    },
  });

  const helpfulVote = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await (supabase as any)
        .from("storefront_product_reviews")
        .update({ helpful_count: (reviews.find((r: any) => r.id === reviewId)?.helpful_count || 0) + 1 })
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storefront-reviews", shopId] }),
  });

  const displayReviews = showAll ? reviews : reviews.slice(0, 5);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" /> Reviews & Ratings
          </h3>
          <Badge variant="outline" className="text-[10px]">{totalReviews} reviews</Badge>
        </div>

        {/* Aggregate Score */}
        {totalReviews > 0 && (
          <div className="flex gap-4 items-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{avgRating}</div>
              <div className="flex gap-0.5 justify-center mt-1">
                {STARS.map(s => (
                  <Star key={s} className={`h-3 w-3 ${s <= Math.round(Number(avgRating)) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{totalReviews} total</p>
            </div>
            <div className="flex-1 space-y-1">
              {distribution.map(d => (
                <div key={d.star} className="flex items-center gap-2 text-[10px]">
                  <span className="w-3">{d.star}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="w-6 text-right text-muted-foreground">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Write Review (buyer mode) */}
        {mode === "buyer" && user && (
          <div className="border border-border rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium">Write a review</p>
            <div className="flex gap-1">
              {STARS.map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star className={`h-5 w-5 transition-colors ${s <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={2}
              className="text-xs"
            />
            <Button size="sm" className="text-xs" onClick={() => submitReview.mutate()} disabled={submitReview.isPending}>
              Submit Review
            </Button>
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-3">
          {displayReviews.map((r: any) => (
            <div key={r.id} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{r.reviewer_name}</span>
                  {r.verified && (
                    <Badge variant="secondary" className="text-[9px] gap-0.5">
                      <ShieldCheck className="h-2.5 w-2.5" /> Verified
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex gap-0.5">
                {STARS.map(s => (
                  <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}

              {/* Seller Response */}
              {r.seller_response && (
                <div className="bg-muted/30 rounded-md p-2 ml-4 border-l-2 border-primary/30">
                  <p className="text-[10px] font-medium text-primary mb-0.5">Seller Response</p>
                  <p className="text-xs text-muted-foreground">{r.seller_response}</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                {/* Helpful */}
                <button onClick={() => helpfulVote.mutate(r.id)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                  <ThumbsUp className="h-3 w-3" /> {r.helpful_count || 0}
                </button>
                {/* Report */}
                <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive">
                  <Flag className="h-3 w-3" /> Report
                </button>
              </div>

              {/* Seller respond (seller mode) */}
              {mode === "seller" && !r.seller_response && (
                <div className="flex gap-2 mt-1">
                  <Textarea
                    value={responseText[r.id] || ""}
                    onChange={e => setResponseText(p => ({ ...p, [r.id]: e.target.value }))}
                    placeholder="Reply to this review..."
                    rows={1}
                    className="text-xs flex-1"
                  />
                  <Button size="sm" variant="outline" className="text-[10px] shrink-0"
                    onClick={() => respondToReview.mutate({ reviewId: r.id, response: responseText[r.id] || "" })}
                    disabled={!responseText[r.id]?.trim()}>
                    <MessageSquare className="h-3 w-3 mr-1" /> Reply
                  </Button>
                </div>
              )}

              {/* Moderation (seller mode) */}
              {mode === "seller" && (
                <div className="flex gap-1 mt-1">
                  <Button size="sm" variant="ghost" className="text-[9px] h-6 text-destructive"
                    onClick={() => moderateReview.mutate({ reviewId: r.id, status: "hidden" })}>
                    Hide
                  </Button>
                  <Button size="sm" variant="ghost" className="text-[9px] h-6"
                    onClick={() => moderateReview.mutate({ reviewId: r.id, status: "flagged" })}>
                    Flag
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {reviews.length > 5 && (
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowAll(!showAll)}>
            <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${showAll ? "rotate-180" : ""}`} />
            {showAll ? "Show less" : `Show all ${reviews.length} reviews`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
