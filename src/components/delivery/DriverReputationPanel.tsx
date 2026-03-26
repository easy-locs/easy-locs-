/**
 * DriverReputationPanel — Driver reputation system with badges, levels, and performance metrics.
 * PASS83-W: Driver Reputation System
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, Star, Zap, Heart, Clock, Award, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  driverId?: string; // If not provided, shows current user's reputation
  className?: string;
}

interface ReputationData {
  totalDeliveries: number;
  avgRating: number;
  totalRatings: number;
  onTimeRate: number;
  acceptanceRate: number;
  cancellationRate: number;
  level: number;
  levelName: string;
  levelProgress: number;
  xp: number;
  nextLevelXp: number;
  badges: Badge[];
  categoryScores: { category: string; avg: number; count: number }[];
}

interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earned: boolean;
  requirement: string;
}

const LEVELS = [
  { level: 1, name: "Débutant", minXp: 0, emoji: "🌱" },
  { level: 2, name: "Confirmé", minXp: 100, emoji: "⭐" },
  { level: 3, name: "Expert", minXp: 300, emoji: "🔥" },
  { level: 4, name: "Master", minXp: 600, emoji: "💎" },
  { level: 5, name: "Légende", minXp: 1000, emoji: "👑" },
];

function computeBadges(data: { totalDeliveries: number; avgRating: number; onTimeRate: number; acceptanceRate: number }): Badge[] {
  return [
    { id: "first", name: "Première livraison", emoji: "🎯", description: "Compléter 1 livraison", earned: data.totalDeliveries >= 1, requirement: "1 livraison" },
    { id: "ten", name: "Routier", emoji: "🚗", description: "10 livraisons complétées", earned: data.totalDeliveries >= 10, requirement: "10 livraisons" },
    { id: "fifty", name: "Marathonien", emoji: "🏃", description: "50 livraisons", earned: data.totalDeliveries >= 50, requirement: "50 livraisons" },
    { id: "hundred", name: "Centurion", emoji: "🏛️", description: "100 livraisons", earned: data.totalDeliveries >= 100, requirement: "100 livraisons" },
    { id: "top_rated", name: "Top Rated", emoji: "⭐", description: "Note moyenne ≥ 4.5", earned: data.avgRating >= 4.5 && data.totalDeliveries >= 5, requirement: "≥ 4.5 étoiles" },
    { id: "punctual", name: "Ponctuel", emoji: "⏱️", description: "95% à l'heure", earned: data.onTimeRate >= 95 && data.totalDeliveries >= 10, requirement: "95% on-time" },
    { id: "reliable", name: "Fiable", emoji: "🛡️", description: "90% taux d'acceptation", earned: data.acceptanceRate >= 90 && data.totalDeliveries >= 10, requirement: "90% acceptation" },
    { id: "speed", name: "Flash", emoji: "⚡", description: "Livraison < 30 min en moyenne", earned: false, requirement: "< 30 min moy." },
  ];
}

export default function DriverReputationPanel({ driverId, className }: Props) {
  const { user } = useAuth();
  const targetId = driverId || user?.id;
  const [data, setData] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      // Fetch completed deliveries
      const { data: jobs } = await supabase
        .from("mobility_jobs")
        .select("id, status, created_at, completed_at, accepted_at")
        .eq("rider_user_id", targetId)
        .limit(500);

      const all = jobs || [];
      const completed = all.filter(j => j.status === "completed");
      const cancelled = all.filter(j => j.status === "cancelled");
      const totalDeliveries = completed.length;

      // Fetch ratings
      const { data: ratings } = await supabase
        .from("delivery_ratings")
        .select("rating, categories")
        .eq("driver_id", targetId);

      const allRatings = ratings || [];
      const avgRating = allRatings.length ? allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length : 0;

      // Category breakdown
      const catMap = new Map<string, { sum: number; count: number }>();
      allRatings.forEach(r => {
        (r.categories || []).forEach((cat: string) => {
          const e = catMap.get(cat) || { sum: 0, count: 0 };
          e.sum += r.rating;
          e.count++;
          catMap.set(cat, e);
        });
      });

      // Fetch driver session for acceptance rate
      const { data: session } = await supabase
        .from("driver_sessions")
        .select("acceptance_rate, total_completed, total_cancelled")
        .eq("user_id", targetId)
        .maybeSingle();

      const acceptanceRate = session?.acceptance_rate || (all.length ? ((all.length - cancelled.length) / all.length) * 100 : 100);
      const cancellationRate = all.length ? (cancelled.length / all.length) * 100 : 0;

      // On-time rate (delivered within 2 hours of creation)
      const onTime = completed.filter((j: any) => {
        if (!j.created_at || !j.completed_at) return true;
        const diff = (new Date(j.completed_at).getTime() - new Date(j.created_at).getTime()) / 3600000;
        return diff <= 2;
      });
      const onTimeRate = completed.length ? (onTime.length / completed.length) * 100 : 100;

      // XP calculation: 10 per delivery + 5 per rating star + bonus for badges
      const xp = totalDeliveries * 10 + allRatings.reduce((s, r) => s + r.rating * 5, 0);
      const currentLevel = [...LEVELS].reverse().find(l => xp >= l.minXp) || LEVELS[0];
      const nextLevel = LEVELS.find(l => l.minXp > xp) || LEVELS[LEVELS.length - 1];
      const levelProgress = nextLevel.minXp > currentLevel.minXp
        ? ((xp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100
        : 100;

      const badges = computeBadges({ totalDeliveries, avgRating, onTimeRate, acceptanceRate });

      setData({
        totalDeliveries,
        avgRating: Math.round(avgRating * 10) / 10,
        totalRatings: allRatings.length,
        onTimeRate: Math.round(onTimeRate),
        acceptanceRate: Math.round(acceptanceRate),
        cancellationRate: Math.round(cancellationRate),
        level: currentLevel.level,
        levelName: `${currentLevel.emoji} ${currentLevel.name}`,
        levelProgress: Math.round(levelProgress),
        xp,
        nextLevelXp: nextLevel.minXp,
        badges,
        categoryScores: Array.from(catMap.entries()).map(([category, v]) => ({
          category,
          avg: Math.round((v.sum / v.count) * 10) / 10,
          count: v.count,
        })),
      });
    } catch (err) {
      console.error("[reputation]", err);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
    </div>;
  }
  if (!data) return null;

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Level card */}
      <div className="rounded-xl p-4 text-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--warning) / 0.08), hsl(var(--hud-cyan) / 0.06))", border: "1px solid hsl(var(--warning) / 0.12)" }}>
        <p className="text-2xl font-black" style={{ color: "hsl(var(--warning))" }}>{data.levelName}</p>
        <p className="text-[10px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
          {data.xp} XP • Prochain niveau: {data.nextLevelXp} XP
        </p>
        <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-border) / 0.1)" }}>
          <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${data.levelProgress}%` }}
            style={{ background: "linear-gradient(90deg, hsl(var(--warning)), hsl(var(--hud-cyan)))" }} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Star, label: "Note", value: data.avgRating ? `${data.avgRating}/5` : "—", color: "--warning" },
          { icon: Zap, label: "Livraisons", value: data.totalDeliveries.toString(), color: "--hud-cyan" },
          { icon: Clock, label: "Ponctualité", value: `${data.onTimeRate}%`, color: "--success" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl p-2.5 text-center"
              style={{ background: `hsl(var(${s.color}) / 0.06)`, border: `1px solid hsl(var(${s.color}) / 0.1)` }}>
              <Icon className="h-3.5 w-3.5 mx-auto mb-0.5" style={{ color: `hsl(var(${s.color}))` }} />
              <p className="text-sm font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
              <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Performance bars */}
      <div className="rounded-xl p-3 space-y-2"
        style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>
          <TrendingUp className="h-3 w-3 inline mr-1" /> Performance
        </p>
        {[
          { label: "Taux d'acceptation", value: data.acceptanceRate, color: "var(--success)" },
          { label: "Ponctualité", value: data.onTimeRate, color: "var(--hud-cyan)" },
          { label: "Annulations", value: data.cancellationRate, color: "var(--destructive)", invert: true },
        ].map(m => (
          <div key={m.label}>
            <div className="flex justify-between mb-0.5">
              <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{m.label}</span>
              <span className="text-[9px] font-bold" style={{ color: `hsl(${m.color})` }}>{m.value}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "hsl(var(--hud-border) / 0.08)" }}>
              <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                animate={{ width: `${Math.min(m.value, 100)}%` }}
                style={{ background: `hsl(${m.color})` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="rounded-xl p-3"
        style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>
          <Award className="h-3 w-3 inline mr-1" /> Badges ({data.badges.filter(b => b.earned).length}/{data.badges.length})
        </p>
        <div className="grid grid-cols-4 gap-2">
          {data.badges.map(badge => (
            <motion.div key={badge.id}
              className="rounded-lg p-2 text-center"
              style={{
                background: badge.earned ? "hsl(var(--warning) / 0.08)" : "hsl(var(--hud-border) / 0.04)",
                border: `1px solid ${badge.earned ? "hsl(var(--warning) / 0.15)" : "hsl(var(--hud-border) / 0.06)"}`,
                opacity: badge.earned ? 1 : 0.4,
              }}
              title={badge.description}>
              <span className="text-lg">{badge.emoji}</span>
              <p className="text-[7px] mt-0.5 truncate" style={{ color: badge.earned ? "hsl(var(--hud-text))" : "hsl(var(--hud-text-dim) / 0.3)" }}>
                {badge.name}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
