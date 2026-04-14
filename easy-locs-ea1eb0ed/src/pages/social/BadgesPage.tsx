import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { ArrowLeft, Award, Lock, Loader2 } from "lucide-react";
import { BADGE_DEFINITIONS, fetchUserBadges, syncUserBadges, collectUserStats, type UserBadge } from "@/lib/social/badge-system";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const CATEGORY_LABELS: Record<string, string> = {
  commerce: "Commerce",
  engagement: "Engagement",
  social: "Social",
  loyalty: "Loyalty",
  milestone: "Milestones",
};

export default function BadgesPage() {
  useUiEngine("badges-page");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const stats = await collectUserStats(user.id);
        const result = await syncUserBadges(user.id, stats);
        setBadges(result);
      } catch {
        const existing = await fetchUserBadges(user.id).catch(() => []);
        setBadges(existing);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const unlockedIds = new Set(badges.map((b) => b.badge_id));
  const categories = [...new Set(BADGE_DEFINITIONS.map((b) => b.category))];

  return (
    <SubPageShell className="bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-all duration-200 bg-card border border-border/10"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Badges & Achievements</h1>
          <p className="text-xs text-muted-foreground">
            {badges.length}/{BADGE_DEFINITIONS.length} unlocked
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-6 rounded-2xl p-5 text-center"
          style={{ background: "linear-gradient(135deg, hsl(var(--accent) / 0.1), hsl(228 28% 7% / 0.08))" }}
        >
          <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center bg-amber-500/10">
            <Award className="w-8 h-8 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{badges.length}</p>
          <p className="text-xs text-muted-foreground">Badges Earned</p>
        </motion.div>
      )}

      {!loading && categories.map((cat) => {
        const defs = BADGE_DEFINITIONS.filter((b) => b.category === cat);
        return (
          <div key={cat} className="px-4 mb-5">
            <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground/50 mb-3">
              {CATEGORY_LABELS[cat] ?? cat}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {defs.map((badge, idx) => {
                const unlocked = unlockedIds.has(badge.id);
                const userBadge = badges.find((b) => b.badge_id === badge.id);
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`rounded-xl p-3 text-center border transition-all ${
                      unlocked
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "border-border/10 bg-card/30 opacity-50"
                    }`}
                  >
                    <div className="text-2xl mb-1">{unlocked ? badge.emoji : "🔒"}</div>
                    <p className="text-[10px] font-bold text-foreground leading-tight">{badge.name}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{badge.description}</p>
                    {unlocked && userBadge && (
                      <p className="text-[8px] text-amber-500 mt-1">
                        {(() => { try { return new Date(userBadge.unlocked_at).toLocaleDateString(); } catch { return ""; } })()}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </SubPageShell>
  );
}
