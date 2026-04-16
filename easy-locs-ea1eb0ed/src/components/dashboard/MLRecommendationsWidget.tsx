import { useRecommendations } from "@/hooks/useRecommendations";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, MapPin, Star, TrendingUp, Heart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import CardHealthDot, { type CardHealth } from "@/components/dashboard/CardHealthDot";
import { useLoadingCap } from "@/hooks/useLoadingCap";
import { useDashboardCardEnabled } from "@/lib/feature-flags/dashboard-cards";

const REASON_ICONS: Record<string, typeof Star> = {
  vector_similarity: Sparkles,
  collaborative: TrendingUp,
  favorites: Heart,
  proximity: MapPin,
  trending: TrendingUp,
};

export default function MLRecommendationsWidget() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { recommendations, loading, refresh } = useRecommendations({
    userId: user?.id,
    limit: 4,
  });
  const { timedOut } = useLoadingCap(loading && recommendations.length === 0);
  const health: CardHealth = timedOut && recommendations.length === 0
    ? "error"
    : loading
      ? "loading"
      : recommendations.length === 0
        ? "disabled"
        : "ok";

  const __enabled = useDashboardCardEnabled("mlRecommendations"); if (!__enabled) return null;

  if (timedOut && recommendations.length === 0) {
    return (
      <AppCard>
        <CardContent className="p-4 flex items-center gap-2">
          <CardHealthDot status="error" title="Recommendations unavailable" />
          <span className="text-sm text-muted-foreground">Recommendations unavailable.</span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />Retry
          </Button>
        </CardContent>
      </AppCard>
    );
  }

  if (loading && recommendations.length === 0 && !timedOut) {
    return (
      <AppCard>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{t("recommendations.for_you")}</span>
          </div>
          <div className="py-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        </CardContent>
      </AppCard>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <AppCard>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{t("recommendations.for_you")}</span>
            <CardHealthDot status={health} title={`Recommendations: ${health}`} />
          </div>
          <Button size="sm" variant="ghost" onClick={refresh} className="h-7 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {recommendations.map((rec, idx) => {
            const ReasonIcon = REASON_ICONS[rec.matchReason] || Sparkles;
            return (
              <motion.button
                key={rec.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => rec.route && navigate(rec.route)}
                className="rounded-xl border border-border/15 bg-card/60 p-3 text-left active:scale-[0.97] transition-transform"
              >
                {rec.imageUrl && (
                  <img
                    src={rec.imageUrl}
                    alt=""
                    className="w-full h-16 rounded-lg object-cover mb-2"
                  />
                )}
                <p className="text-xs font-semibold text-foreground line-clamp-1">{rec.title}</p>
                {rec.subtitle && (
                  <p className="text-[0.625rem] text-muted-foreground line-clamp-1 mt-0.5">{rec.subtitle}</p>
                )}
                <div className="flex items-center gap-1 mt-1.5">
                  <ReasonIcon className="h-2.5 w-2.5 text-primary" />
                  <span className="text-[0.5625rem] text-primary font-medium">
                    {rec.matchReason === "vector_similarity" && t("recommendations.matches_interests")}
                    {rec.matchReason === "collaborative" && t("recommendations.users_enjoyed")}
                    {rec.matchReason === "trending" && t("recommendations.trending")}
                    {rec.matchReason === "favorites" && t("recommendations.favorites")}
                    {rec.matchReason === "proximity" && t("recommendations.near_you")}
                    {!["vector_similarity", "collaborative", "trending", "favorites", "proximity"].includes(rec.matchReason) && t("recommendations.for_you")}
                  </span>
                </div>
                {rec.score != null && (
                  <div className="mt-1">
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full"
                        style={{ width: `${Math.min(rec.score * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </AppCard>
  );
}
