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

const BADGES: Badge[] = [];

const LEADERBOARD: LeaderboardEntry[] = [];

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
              <p className="text-lg font-extrabold tabular-nums" style={{ color: "hsl(var(--warning))" }}>Niveau {myLevel}</p>
              <p className="text-[11px]" style={{ color: "hsl(var(--hud-text))" }}>{myXP.toLocaleString()} XP</p>
              <div className="w-full rounded-full h-2 mt-2" style={{ background: "hsl(var(--hud-bg))" }}>
                <motion.div className="h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${myProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{ background: "linear-gradient(90deg, hsl(var(--warning)), hsl(var(--hud-cyan)))" }} />
              </div>
              <p className="text-[10px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
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
                  <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Streak bonus */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--warning) / 0.12)" }}>
              <Flame className="h-5 w-5" style={{ color: "hsl(var(--warning))" }} />
              <div className="flex-1">
                <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>Streak Bonus Actif</p>
                <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>+{Math.min(myStreak * 5, 50)}% XP bonus sur chaque livraison</p>
              </div>
              <span className="text-sm font-extrabold tabular-nums" style={{ color: "hsl(var(--warning))" }}>x{(1 + Math.min(myStreak * 0.05, 0.5)).toFixed(2)}</span>
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
                    <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{b.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold" style={{ color: "hsl(var(--warning))" }}>+{b.xpReward} XP</p>
                    {b.earned && <span className="text-[10px]" style={{ color: "hsl(var(--success))" }}>✅ Obtenu</span>}
                  </div>
                </div>
                {!b.earned && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{b.requirement}</span>
                      <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-cyan))" }}>{b.progress}%</span>
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
                  <span className="text-sm font-extrabold tabular-nums w-6 text-center" style={{
                    color: e.rank <= 3 ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim) / 0.4)",
                  }}>
                    {e.rank <= 3 ? e.badge : `#${e.rank}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold" style={{ color: isMe ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text))" }}>
                      {e.name} {isMe && "⬅️"}
                    </p>
                    <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
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
