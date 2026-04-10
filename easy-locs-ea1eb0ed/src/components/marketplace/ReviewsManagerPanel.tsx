import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Reply, MessageSquare, Filter } from "lucide-react";
import { format } from "date-fns";
import ReviewReplyDialog from "./ReviewReplyDialog";

interface Props {
  providerId: string;
}

export default function ReviewsManagerPanel({ providerId }: Props) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReview, setSelectedReview] = useState<any>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["provider_reviews_manage", providerId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("marketplace_reviews")
        .select("*, marketplace_services(title)")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data } = await query;
      return (data || []).map((r: any) => ({
        ...r,
        service_title: r.marketplace_services?.title || null,
      }));
    },
    enabled: !!providerId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["provider_reviews_manage", providerId] });
    queryClient.invalidateQueries({ queryKey: ["provider_reviews", providerId] });
  };

  const stars = (rating: number) => Array.from({ length: 5 }, (_, i) => i < Math.round(rating));

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Loading reviews...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-accent" />
          Reviews ({reviews.length})
        </h3>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No reviews yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review: any) => (
            <Card key={review.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{review.reviewer_name}</span>
                      <Badge
                        variant={review.status === "published" ? "default" : review.status === "flagged" ? "destructive" : "secondary"}
                        className="text-[10px] h-5"
                      >
                        {review.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex gap-0.5">
                        {stars(review.rating).map((filled, i) => (
                          <Star key={i} className={`h-3 w-3 ${filled ? "text-[hsl(var(--chart-4))] fill-[hsl(var(--chart-4))]" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {(() => { try { return format(new Date(review.created_at), "MMM d, yyyy"); } catch { return review.created_at; } })()}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1 text-xs h-7"
                    onClick={() => setSelectedReview(review)}
                  >
                    <Reply className="h-3 w-3" />
                    {review.response ? "Edit Reply" : "Reply"}
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">{review.comment}</p>

                {review.service_title && (
                  <span className="text-[11px] text-muted-foreground">📌 {review.service_title}</span>
                )}

                {review.response && (
                  <div className="ml-3 pl-3 border-l-2 border-accent/30 mt-2">
                    <p className="text-xs font-medium text-accent mb-0.5">Your reply</p>
                    <p className="text-sm text-muted-foreground">{review.response}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedReview && (
        <ReviewReplyDialog
          open={!!selectedReview}
          onOpenChange={(v) => !v && setSelectedReview(null)}
          review={selectedReview}
          onUpdated={refresh}
        />
      )}
    </div>
  );
}
