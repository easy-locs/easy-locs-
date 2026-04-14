import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Star, ArrowRight } from "lucide-react";
import { useSubscriptionGating } from "@/hooks/useSubscriptionGating";
import { useI18n } from "@/lib/i18n";

interface ReviewPaywallProps {
  children: React.ReactNode;
  reviewCount?: number;
  averageRating?: number;
}

export function useReviewAccess() {
  const { canAccess, isLoading } = useSubscriptionGating();
  return { unlocked: canAccess("reviews"), isLoading };
}

export default function ReviewPaywall({ children, reviewCount = 0, averageRating }: ReviewPaywallProps) {
  const { unlocked, isLoading } = useReviewAccess();
  const { t } = useI18n();

  if (isLoading) return null;

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="pointer-events-none select-none" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-muted/20 h-20 mb-3" style={{ filter: "blur(6px)", opacity: 0.3 }}>
            <div className="p-4 space-y-2">
              <div className="h-3 w-24 rounded bg-muted/40" />
              <div className="h-2 w-48 rounded bg-muted/30" />
              <div className="h-2 w-36 rounded bg-muted/30" />
            </div>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 flex flex-col items-center justify-center px-6"
        style={{
          background: "linear-gradient(180deg, hsl(226 24% 14% / 0.7) 0%, hsl(226 24% 14% / 0.92) 100%)",
          backdropFilter: "blur(4px)",
        }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="flex flex-col items-center gap-4"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(var(--accent) / 0.25) 0%, hsl(var(--accent) / 0.08) 100%)",
              border: "1px solid hsl(var(--accent) / 0.35)",
            }}
          >
            <Lock className="h-6 w-6" style={{ color: "hsl(var(--accent))" }} />
          </div>

          {reviewCount > 0 && (
            <div className="flex items-center gap-2">
              {averageRating != null && averageRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-current" style={{ color: "hsl(var(--accent))" }} />
                  <span className="text-sm font-bold" style={{ color: "hsl(var(--accent))" }}>
                    {averageRating.toFixed(1)}
                  </span>
                </div>
              )}
              <span className="text-sm" style={{ color: "hsl(0 0% 100% / 0.7)" }}>
                {reviewCount} {reviewCount === 1
                  ? ((() => { const v = t("reviews.review_singular"); return v && v !== "reviews.review_singular" ? v : "review"; })())
                  : ((() => { const v = t("reviews.review_plural"); return v && v !== "reviews.review_plural" ? v : "reviews"; })())}
              </span>
            </div>
          )}

          <p
            className="text-center text-sm font-semibold leading-snug max-w-[220px]"
            style={{ color: "hsl(0 0% 100% / 0.9)" }}
          >
            {(() => { const v = t("reviews.paywall_title"); return v && v !== "reviews.paywall_title" ? v : "Unlock customer reviews"; })()}
          </p>
          <p
            className="text-center text-xs max-w-[240px] leading-relaxed"
            style={{ color: "hsl(0 0% 100% / 0.55)" }}
          >
            {(() => { const v = t("reviews.paywall_desc"); return v && v !== "reviews.paywall_desc" ? v : "Subscribe to see all reviews, ratings, and merchant replies"; })()}
          </p>

          <Link
            to="/dashboard/billing"
            className="inline-flex items-center gap-2 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all duration-200 active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(168 65% 38%) 100%)",
              color: "hsl(226 24% 14%)",
              boxShadow: "0 4px 16px hsl(var(--accent) / 0.35)",
            }}
          >
            {(() => { const v = t("reviews.unlock_cta"); return v && v !== "reviews.unlock_cta" ? v : "Upgrade to unlock"; })()}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
