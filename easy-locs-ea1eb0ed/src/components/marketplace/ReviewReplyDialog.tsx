import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, Reply, Eye, EyeOff, Flag, Send } from "lucide-react";
import { db } from "@/services/db";
import { toast } from "sonner";

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  response: string | null;
  status: string;
  service_title?: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  review: Review;
  onUpdated: () => void;
}

export default function ReviewReplyDialog({ open, onOpenChange, review, onUpdated }: Props) {
  const [reply, setReply] = useState(review.response || "");
  const [submitting, setSubmitting] = useState(false);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSubmitting(true);
    const { error } = await db
      .from("marketplace_reviews")
      .update({
        response: reply.trim(),
        responded_at: new Date().toISOString(),
      })
      .eq("id", review.id);
    if (error) toast.error(error.message);
    else { toast.success("Reply saved"); onUpdated(); onOpenChange(false); }
    setSubmitting(false);
  };

  const handleModerate = async (status: string) => {
    setSubmitting(true);
    const { error } = await db
      .from("marketplace_reviews")
      .update({ status })
      .eq("id", review.id);
    if (error) toast.error(error.message);
    else { toast.success(`Review ${status}`); onUpdated(); onOpenChange(false); }
    setSubmitting(false);
  };

  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(review.rating));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Reply className="h-5 w-5 text-accent" />
            Review Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Review content */}
          <div className="p-3 bg-muted/20 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{review.reviewer_name}</span>
              <Badge variant={review.status === "published" ? "default" : review.status === "flagged" ? "destructive" : "secondary"} className="text-[10px]">
                {review.status}
              </Badge>
            </div>
            <div className="flex gap-0.5">
              {stars.map((filled, i) => (
                <Star key={i} className={`h-3.5 w-3.5 ${filled ? "text-[hsl(var(--chart-4))] fill-[hsl(var(--chart-4))]" : "text-muted-foreground/30"}`} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{review.comment}</p>
            {review.service_title && (
              <span className="text-[11px] text-muted-foreground">📌 {review.service_title}</span>
            )}
          </div>

          {/* Reply */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Your reply</label>
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Thank the reviewer or address their feedback..."
              rows={3}
              maxLength={500}
            />
          </div>

          <Button onClick={handleReply} disabled={submitting || !reply.trim()} className="w-full gap-2">
            <Send className="h-4 w-4" />
            {review.response ? "Update Reply" : "Post Reply"}
          </Button>

          {/* Moderation actions */}
          <div className="pt-2 border-t border-border/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Moderation</p>
            <div className="flex gap-2">
              {review.status !== "published" && (
                <Button size="sm" variant="outline" onClick={() => handleModerate("published")} disabled={submitting} className="flex-1 gap-1 text-xs">
                  <Eye className="h-3 w-3" /> Publish
                </Button>
              )}
              {review.status !== "hidden" && (
                <Button size="sm" variant="outline" onClick={() => handleModerate("hidden")} disabled={submitting} className="flex-1 gap-1 text-xs">
                  <EyeOff className="h-3 w-3" /> Hide
                </Button>
              )}
              {review.status !== "flagged" && (
                <Button size="sm" variant="destructive" onClick={() => handleModerate("flagged")} disabled={submitting} className="flex-1 gap-1 text-xs">
                  <Flag className="h-3 w-3" /> Flag
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
