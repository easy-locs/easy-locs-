/**
 * ModerationPanel — Content moderation queue for admins.
 * Reviews pending moderation, flagged content, user reports.
 * PASS55 Block H: Admin / Audit
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert, MessageSquare, Star, Flag,
  Check, X, Eye, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { format } from "date-fns";
import { fr as frLocale } from "@/lib/date-locales";
import {
  fetchPendingReviews, moderateReview as moderateReviewRepo,
  fetchBlockedUsers as fetchBlockedUsersRepo, unblockUser as unblockUserRepo,
} from "@/repositories/admin.repository";

type ModerationTab = "reviews" | "blocked";

interface PendingReview {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  status: string;
  created_at: string;
  service_title?: string;
}

export default function ModerationPanel() {
  const { orgId } = useAuth();
  const [tab, setTab] = useState<ModerationTab>("reviews");
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);

    if (tab === "reviews") {
      fetchPendingReviews(orgId).then(data => {
        setReviews(data as PendingReview[]);
        setLoading(false);
      });
    } else {
      fetchBlockedUsersRepo().then(data => {
        setBlockedUsers(data);
        setLoading(false);
      });
    }
  }, [orgId, tab]);

  const moderateReview = async (reviewId: string, action: "published" | "rejected") => {
    try {
      await moderateReviewRepo(reviewId, action);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      haptic(action === "published" ? "success" : "warning");
      toast.success(action === "published" ? "Avis approuvé" : "Avis rejeté");
    } catch {
      toast.error("Erreur de modération");
    }
  };

  const unblockUser = async (blockId: string) => {
    try {
      await unblockUserRepo(blockId);
      setBlockedUsers((prev) => prev.filter((b) => b.id !== blockId));
      toast.success("Utilisateur débloqué");
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Modération</h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {([
          { id: "reviews" as ModerationTab, label: "Avis en attente", icon: Star, count: reviews.length },
          { id: "blocked" as ModerationTab, label: "Utilisateurs bloqués", icon: Flag, count: blockedUsers.length },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); haptic("selection"); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--primary) / 0.1)" : "hsl(var(--muted) / 0.5)",
              color: tab === t.id ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              border: `1px solid ${tab === t.id ? "hsl(var(--primary) / 0.2)" : "transparent"}`,
            }}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
            {t.count > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : tab === "reviews" ? (
        reviews.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Check className="w-8 h-8 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">Aucun avis en attente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-3 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{review.reviewer_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className="w-3 h-3"
                          style={{
                            color: s < review.rating ? "hsl(38 92% 50%)" : "hsl(var(--muted))",
                            fill: s < review.rating ? "hsl(38 92% 50%)" : "none",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <time className="text-[10px] text-muted-foreground">
                    {format(new Date(review.created_at), "dd MMM", { locale: frLocale })}
                  </time>
                </div>

                {review.comment && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                    {review.comment}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 h-8 text-[11px]"
                    onClick={() => moderateReview(review.id, "published")}
                  >
                    <Check className="w-3 h-3" /> Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 h-8 text-[11px] text-destructive border-destructive/20 hover:bg-destructive/5"
                    onClick={() => moderateReview(review.id, "rejected")}
                  >
                    <X className="w-3 h-3" /> Rejeter
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        blockedUsers.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Check className="w-8 h-8 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">Aucun utilisateur bloqué</p>
          </div>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((bu) => (
              <div key={bu.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                <Flag className="w-4 h-4 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                   <p className="text-xs font-medium text-foreground break-words leading-snug">
                     {bu.blocked_id}
                   </p>
                  {bu.reason && (
                    <p className="text-[10px] text-muted-foreground break-words leading-snug">{bu.reason}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px]"
                  onClick={() => unblockUser(bu.id)}
                >
                  Débloquer
                </Button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
