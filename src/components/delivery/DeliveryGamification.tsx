/**
 * DeliveryGamification — VV. Driver Gamification System
 * Badges, streaks, leaderboards, XP rewards.
 * PASS89-VV
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Flame, Star, Medal, Zap, TrendingUp, Crown, Award } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  xpReward: number;
  earned: boolean;
  progress: number; // 0-100
  requirement: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  level: number;
  streak: number;
  badge: string;
}

const BADGES: Badge[] = [
  { id: "first_delivery", name: "Première Livraison", emoji: "🎯", description: "Complétez votre première livraison", xpReward: 50, earned: true, progress: 100, requirement: "1 livraison" },
  { id: "speed_demon", name: "Speed Demon", emoji: "⚡", description: "10 livraisons express à temps", xpReward: 200, earned: true, progress: 100, requirement: "10 express" },
  { id: "five_star", name: "5 Étoiles", emoji: "⭐", description: "Maintenez 5.0 sur 20 livraisons", xpReward: 300, earned: false, progress: 75, requirement: "15/20 livraisons 5★" },
  { id: "marathon", name: "Marathonien", emoji: "🏃", description: "100 livraisons complétées", xpReward: 500, earned: false, progress: 42, requirement: "42/100 livraisons" },
  { id: "night_owl", name: "Noctambule", emoji: "🦉", description: "25 livraisons après 22h", xpReward: 150, earned: false, progress: 32, requirement: "8/25 livraisons nuit" },
  { id: "perfect_week", name: "Semaine Parfaite", emoji: "🏆", description: "7 jours consécutifs sans annulation", xpReward: 250, earned: true, progress: 100, requirement: "7 jours" },
  { id: "heavy_lifter", name: "Costaud", emoji: "💪", description: "50 colis de +10kg livrés", xpReward: 200, earned: false, progress: 60, requirement: "30/50 colis lourds" },
  { id: "community", name: "Leader", emoji: "👑", description: "Top 3 du classement mensuel", xpReward: 1000, earned: false, progress: 10, requirement: "Top 3 mensuel" },
];

const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: "Mohamed K.", xp: 4850, level: 12, streak: 14, badge: "👑" },
  { rank: 2, name: "Sophie L.", xp: 4200, level: 11, streak: 9, badge: "🥈" },
  { rank: 3, name: "Ali B.", xp: 3800, level: 10, streak: 7, badge: "🥉" },
  { rank: 4, name: "Vous", xp: 3150, level: 8, streak: 5, badge: "⭐" },
  { rank: 5, name: "Fatima R.", xp: 2900, level: 8, streak: 3, badge: "🔥" },
  { rank: 6, name: "Lucas M.", xp: 2600, level: 7, streak: 2, badge: "💎" },
  { rank: 7, name: "Sarah D.", xp: 2100, level: 6, streak: 0, badge: "🌟" },
];

const XP_PER_LEVEL = 500;

function getLevel(xp: number) { return Math.floor(xp / XP_PER_LEVEL) + 1; }
function getLevelProgress(xp: number) { return ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100; }

export default function DeliveryGamification() {
  const [tab, setTab] = useState<"profile" | "badges" | "leaderboard">("profile");

  const myXP = 3150;
  const myLevel = getLevel(myXP);
  const myProgress = getLevelProgress(myXP);
  const myStreak = 5;
  const earnedBadges = BADGES.filter(b => b.earned).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Gamification</h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "profile" as const, label: "🎮 Profil" },
          { id: "badges" as const, label: "🏅 Badges" },
          { id: "leaderboard" as const, label: "🏆 Classement" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all"
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
            {/* XP Card */}
            <div className="rounded-xl p-4 text-center" style={{ background: "linear-gradient(135deg, hsl(var(--warning) / 0.1), hsl(var(--hud-surface)))", border: "1px solid hsl(var(--warning) / 0.15)" }}>
              <div className="text-3xl mb-1">⭐</div>
              <p className="text-lg font-black" style={{ color: "hsl(var(--warning))" }}>Niveau {myLevel}</p>
              <p className="text-[11px]" style={{ color: "hsl(var(--hud-text))" }}>{myXP.toLocaleString()} XP</p>
              <div className="w-full rounded-full h-2 mt-2" style={{ background: "hsl(var(--hud-bg))" }}>
                <motion.div className="h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${myProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{ background: "linear-gradient(90deg, hsl(var(--warning)), hsl(var(--hud-cyan)))" }} />
              </div>
              <p className="text-[9px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                {XP_PER_LEVEL - (myXP % XP_PER_LEVEL)} XP pour le niveau {myLevel + 1}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { emoji: "🔥", label: "Streak", value: `${myStreak}j` },
                { emoji: "🏅", label: "Badges", value: `${earnedBadges}/${BADGES.length}` },
                { emoji: "🏆", label: "Rang", value: "#4" },
              ].map(s => (
                <div key={s.label} className="text-center py-2.5 rounded-xl" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                  <p className="text-base">{s.emoji}</p>
                  <p className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>{s.value}</p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Streak bonus */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--warning) / 0.12)" }}>
              <Flame className="h-5 w-5" style={{ color: "hsl(var(--warning))" }} />
              <div className="flex-1">
                <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>Streak Bonus Actif</p>
                <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>+{Math.min(myStreak * 5, 50)}% XP bonus sur chaque livraison</p>
              </div>
              <span className="text-sm font-black" style={{ color: "hsl(var(--warning))" }}>x{(1 + Math.min(myStreak * 0.05, 0.5)).toFixed(2)}</span>
            </div>

            {/* Next rewards */}
            <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>🎁 Prochaines récompenses</p>
              {[
                { level: myLevel + 1, reward: "Badge exclusif + 50 LOCS" },
                { level: myLevel + 2, reward: "Boost priorité missions" },
                { level: myLevel + 5, reward: "Accès VIP + 200 LOCS" },
              ].map(r => (
                <div key={r.level} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                  <Zap className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan))" }} />
                  <span className="text-[10px] flex-1" style={{ color: "hsl(var(--hud-text))" }}>Niv. {r.level}: {r.reward}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "badges" && (
          <motion.div key="badges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {BADGES.map(b => (
              <div key={b.id} className="rounded-xl p-3" style={{
                background: b.earned ? "hsl(var(--warning) / 0.06)" : "hsl(var(--hud-surface))",
                border: `1px solid ${b.earned ? "hsl(var(--warning) / 0.15)" : "hsl(var(--hud-border) / 0.08)"}`,
                opacity: b.earned ? 1 : 0.75,
              }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{b.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{b.name}</p>
                    <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{b.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold" style={{ color: "hsl(var(--warning))" }}>+{b.xpReward} XP</p>
                    {b.earned && <span className="text-[9px]" style={{ color: "hsl(var(--success))" }}>✅ Obtenu</span>}
                  </div>
                </div>
                {!b.earned && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{b.requirement}</span>
                      <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--hud-cyan))" }}>{b.progress}%</span>
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

        {tab === "leaderboard" && (
          <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {LEADERBOARD.map(e => {
              const isMe = e.name === "Vous";
              return (
                <div key={e.rank} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{
                    background: isMe ? "hsl(var(--hud-cyan) / 0.06)" : "hsl(var(--hud-surface))",
                    border: `1px solid ${isMe ? "hsl(var(--hud-cyan) / 0.2)" : "hsl(var(--hud-border) / 0.08)"}`,
                  }}>
                  <span className="text-sm font-black w-6 text-center" style={{
                    color: e.rank <= 3 ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim) / 0.4)",
                  }}>
                    {e.rank <= 3 ? e.badge : `#${e.rank}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold" style={{ color: isMe ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text))" }}>
                      {e.name} {isMe && "⬅️"}
                    </p>
                    <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                      Niv. {e.level} • 🔥 {e.streak}j
                    </p>
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: "hsl(var(--warning))" }}>{e.xp.toLocaleString()} XP</span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
