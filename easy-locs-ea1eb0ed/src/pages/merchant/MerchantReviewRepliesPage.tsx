import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { merchantService } from "@/services/merchant.service";
import { toast } from "sonner";
import { recomputeMerchantRating } from "@/lib/reviews/reviewEngine";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function MerchantReviewRepliesPage() {
  useUiEngine("merchant-merchantreviewrepliespage");
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const {
    data: rows = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["merchant-review-replies", merchantId],
    queryFn: () => merchantService.fetchReviews(merchantId),
    enabled: !!merchantId,
    staleTime: 5000,
  });

  const saveReply = async (reviewId: string) => {
    try {
      setSavingId(reviewId);
      const text = drafts[reviewId] ?? "";
      await merchantService.updateReviewReply(reviewId, text.trim() || null);
      await recomputeMerchantRating(merchantId);
      toast.success("Reply saved");
      refetch();
    } catch (err: any) {
      toast.error("Could not save reply");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(`/merchant/dashboard/${merchantId}`)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Review Replies</h1>
          <p className="text-xs text-muted-foreground">Respond to customer feedback</p>
        </div>
      </div>

      {isLoading &&
        [1, 2].map((i) => (
          <div key={i} className="mx-4 mb-3 h-32 rounded-2xl bg-muted animate-pulse" />
        ))}

      {!isLoading && rows.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No reviews yet
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-4">
          {rows.map((row: any) => (
            <div
              key={row.id}
              className="rounded-2xl border border-border/20 bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {"⭐".repeat(Math.max(1, Math.min(5, Number(row.rating ?? 0))))}
                  </p>
                  {row.title ? (
                    <p className="text-sm font-semibold text-foreground">{row.title}</p>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.created_at ? new Date(row.created_at).toLocaleDateString() : ""}
                </p>
              </div>

              {row.comment ? (
                <p className="text-sm text-muted-foreground">{row.comment}</p>
              ) : null}

              <textarea
                value={drafts[row.id] ?? row.merchant_reply ?? ""}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))
                }
                rows={3}
                placeholder="Write a reply..."
                className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none"
              />

              <button
                onClick={() => saveReply(row.id)}
                disabled={savingId === row.id}
                className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {savingId === row.id ? "Saving..." : "Save Reply"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
