import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Loader2, MessageSquare } from "lucide-react";
import { ReviewCard } from "@/components/social/ReviewCard";
import { db } from "@/services/db";
import { useUiEngine } from "@/hooks/useUiEngine";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  title: string | null;
  merchant_reply: string | null;
  replied_at: string | null;
  created_at: string;
  merchant_id: string;
}

interface ListingReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  listing_id: string;
}

export default function MyReviewsPage() {
  useUiEngine("my-reviews-page");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const primary = await db("reviews")
        .select("*")
        .eq("reviewer_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!primary.error && primary.data) {
        setReviews((primary.data as ReviewRow[]) ?? []);
      } else {
        const fallback = await db("listing_reviews")
          .select("*")
          .eq("reviewer_orbit_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (!fallback.error && fallback.data) {
          setReviews((fallback.data as ListingReviewRow[]).map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            title: null,
            merchant_reply: null,
            replied_at: null,
            created_at: r.created_at,
            merchant_id: r.listing_id,
          })));
        } else {
          setReviews([]);
        }
      }
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div className="app-mobile-page app-mobile-content bg-background pb-28">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted/60"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">My Reviews</h1>
          <p className="text-xs text-muted-foreground">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <div className="text-center py-16">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm font-bold text-foreground">No reviews yet</p>
          <p className="text-xs text-muted-foreground mt-1">Your reviews will appear here after you rate a service</p>
        </div>
      )}

      {!loading && reviews.length > 0 && (
        <div className="px-4 space-y-3">
          {reviews.map((r, idx) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <ReviewCard
                reviewerName="You"
                rating={r.rating}
                comment={r.comment ?? r.title}
                date={r.created_at}
                verified
                merchantReply={r.merchant_reply}
                repliedAt={r.replied_at}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
