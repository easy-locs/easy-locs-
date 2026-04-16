/**
 * DeliveryGamification — VV. Driver Gamification System
 * Badges, streaks, leaderboards, XP rewards.
 * PASS89-VV
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Flame, Star, Medal, Zap, TrendingUp, Crown, Award, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverJobStats, type MobilityJobRow } from "@/hooks/useDeliveryData";

interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  xpReward: number;
  earned: boolean;
  progress: number;
  requirement: string;
}

const XP_PER_LEVEL = 500;

function getLevel(xp: number) { return Math.floor(xp / XP_PER_LEVEL) + 1; }
function getLevelProgress(xp: number) { return ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100; }

export default function DeliveryGamification() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useDriverJobStats(user?.id || "");
  const [tab, setTab] = useState<"profile" | "badges">("profile");

  const completedOrders = useMemo(() =>
    orders.filter((o: MobilityJobRow) => o.status === "completed" || o.status === "delivered"),
    [orders]
  );

  const myXP = completedOrders.reduce((s: number, o: MobilityJobRow) => s + 50 + Math.round((o.current_price || o.quoted_price || 0) / 100), 0);
  const myLevel = getLevel(myXP);
  const myProgress = getLevelProgress(myXP);

  const consecutiveDays = useMemo(() => {
    if (completedOrders.length === 0) return 0;
    const dates = completedOrders
      .map((o: MobilityJobRow) => o.created_at?.slice(0, 10))
      .filter(Boolean)
      .sort()
      .reverse();
    const unique = [...new Set(dates)];
    let streak = 1;
    for (let i = 1; i < unique.length; i++) {
      const prev = new Date(unique[i - 1] as string);
      const curr = new Date(unique[i] as string);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff <= 1) streak++;
      else break;
    }
    return streak;
  }, [completedOrders]);

  const badges = useMemo<Badge[]>(() => {
    const count = completedOrders.length;
    return [
      { id: "b1", name: "Première livraison", emoji: "🎯", description: "Effectuer votre première livraison", xpReward: 100, earned: count >= 1, progress: Math.min(100, count * 100), requirement: "1 livraison" },
      { id: "b2", name: "Marathonien", emoji: "🏃", description: "Compléter 10 livraisons", xpReward: 250, earned: count >= 10, progress: Math.min(100, count * 10), requirement: "10 livraisons" },
      { id: "b3", name: "Pro du volant", emoji: "🚗", description: "Compléter 50 livraisons", xpReward: 500, earned: count >= 50, progress: Math.min(100, count * 2), requirement: "50 livraisons" },
      { id: "b4", name: "Légende", emoji: "🏆", description: "Compléter 100 livraisons", xpReward: 1000, earned: count >= 100, progress: Math.min(100, count), requirement: "100 livraisons" },
      { id: "b5", name: "Flamme", emoji: "🔥", description: "Streak de 5 jours consécutifs", xpReward: 300, earned: consecutiveDays >= 5, progress: Math.min(100, consecutiveDays * 20), requirement: "5 jours consécutifs" },
      { id: "b6", name: "Infatigable", emoji: "💪", description: "Streak de 14 jours consécutifs", xpReward: 750, earned: consecutiveDays >= 14, progress: Math.min(100, Math.round(consecutiveDays / 14 * 100)), requirement: "14 jours consécutifs" },
    ];
  }, [completedOrders.length, consecutiveDays]);

  const earnedBadges = badges.filter(b => b.earned).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--warning))" }} />
        <span className="ml-2 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Chargement gamification…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Gamification</h3>
      </div>

      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "profile" as const, label: "🎮 Profil" },
          { id: "badges" as const, label: "🏅 Badges" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-md text-[0.625rem] font-semibold transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--warning) / 0.12)" : "transparent",
              color: tab === t.id ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "profile" && (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="rounded-xl p-4 text-center" style={{ background: "linear-gradient(135deg, hsl(var(--warning) / 0.1), hsl(var(--hud-surface)))", border: "1px solid hsl(var(--warning) / 0.15)" }}>
              <div className="text-3xl mb-1">⭐</div>
              <p className="text-lg font-extrabold tabular-nums" style={{ color: "hsl(var(--warning))" }}>Niveau {myLevel}</p>
              <p className="text-[0.6875rem]" style={{ color: "hsl(var(--hud-text))" }}>{myXP.toLocaleString()} XP</p>
              <div className="w-full rounded-full h-2 mt-2" style={{ background: "hsl(var(--hud-bg))" }}>
                <motion.div className="h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${myProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{ background: "linear-gradient(90deg, hsl(var(--warning)), hsl(var(--hud-cyan)))" }} />
              </div>
              <p className="text-[0.625rem] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                {XP_PER_LEVEL - (myXP % XP_PER_LEVEL)} XP pour le niveau {myLevel + 1}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { emoji: "🔥", label: "Streak", value: `${consecutiveDays}j` },
                { emoji: "🏅", label: "Badges", value: `${earnedBadges}/${badges.length}` },
                { emoji: "📦", label: "Livraisons", value: `${completedOrders.length}` },
              ].map(s => (
                <div key={s.label} className="text-center py-2.5 rounded-xl" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                  <p className="text-base">{s.emoji}</p>
                  <p className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>{s.value}</p>
                  <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--warning) / 0.12)" }}>
              <Flame className="h-5 w-5" style={{ color: "hsl(var(--warning))" }} />
              <div className="flex-1">
                <p className="text-[0.6875rem] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>Streak Bonus {consecutiveDays > 0 ? "Actif" : "Inactif"}</p>
                <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>+{Math.min(consecutiveDays * 5, 50)}% XP bonus sur chaque livraison</p>
              </div>
              <span className="text-sm font-extrabold tabular-nums" style={{ color: "hsl(var(--warning))" }}>x{(1 + Math.min(consecutiveDays * 0.05, 0.5)).toFixed(2)}</span>
            </div>

            <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>🎁 Prochaines récompenses</p>
              {[
                { level: myLevel + 1, reward: "Badge exclusif + 50 LOCS" },
                { level: myLevel + 2, reward: "Boost priorité missions" },
                { level: myLevel + 5, reward: "Accès VIP + 200 LOCS" },
              ].map(r => (
                <div key={r.level} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                  <Zap className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan))" }} />
                  <span className="text-[0.625rem] flex-1" style={{ color: "hsl(var(--hud-text))" }}>Niv. {r.level}: {r.reward}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "badges" && (
          <motion.div key="badges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {badges.length === 0 && (
              <p className="text-center py-6 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucun badge disponible</p>
            )}
            {badges.map(b => (
              <div key={b.id} className="rounded-xl p-3" style={{
                background: b.earned ? "hsl(var(--warning) / 0.06)" : "hsl(var(--hud-surface))",
                border: `1px solid ${b.earned ? "hsl(var(--warning) / 0.15)" : "hsl(var(--hud-border) / 0.08)"}`,
                opacity: b.earned ? 1 : 0.75,
              }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{b.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.6875rem] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{b.name}</p>
                    <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{b.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--warning))" }}>+{b.xpReward} XP</p>
                    {b.earned && <span className="text-[0.625rem]" style={{ color: "hsl(var(--success))" }}>✅ Obtenu</span>}
                  </div>
                </div>
                {!b.earned && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{b.requirement}</span>
                      <span className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--hud-cyan))" }}>{b.progress}%</span>
                    </div>
                    <div className="w-full rounded-full h-1.5 mt-1" style={{ background: "hsl(var(--hud-bg))" }}>
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${b.progress}%`, background: "hsl(var(--hud-cyan))" }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
