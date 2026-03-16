/**
 * DriverReferralProgram — Referral system for drivers.
 * Generate codes, track referrals, earn LOCS rewards.
 * PASS88-QQ: Driver Referral Program
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Gift, Copy, CheckCircle2, TrendingUp, Share2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface Referral {
  id: string;
  refereeName: string;
  status: "pending" | "active" | "completed" | "expired";
  reward: number;
  joinedAt: string;
  completedDeliveries: number;
  requiredDeliveries: number;
}

const REWARD_TIERS = [
  { level: 1, referrals: 1, bonus: 10, badge: "🌱 Starter" },
  { level: 2, referrals: 5, bonus: 75, badge: "🚀 Recruiter" },
  { level: 3, referrals: 15, bonus: 250, badge: "🏆 Ambassador" },
  { level: 4, referrals: 30, bonus: 600, badge: "💎 Elite Sponsor" },
];

export default function DriverReferralProgram() {
  const [referralCode] = useState(() => "EL-DRV-" + Math.random().toString(36).substring(2, 8).toUpperCase());
  const [referrals] = useState<Referral[]>([
    { id: "r1", refereeName: "Youssef M.", status: "completed", reward: 15, joinedAt: new Date(Date.now() - 86400000 * 12).toISOString(), completedDeliveries: 10, requiredDeliveries: 10 },
    { id: "r2", refereeName: "Aïcha K.", status: "active", reward: 15, joinedAt: new Date(Date.now() - 86400000 * 5).toISOString(), completedDeliveries: 6, requiredDeliveries: 10 },
    { id: "r3", refereeName: "Omar B.", status: "pending", reward: 15, joinedAt: new Date(Date.now() - 86400000 * 1).toISOString(), completedDeliveries: 0, requiredDeliveries: 10 },
  ]);

  const stats = useMemo(() => ({
    total: referrals.length,
    completed: referrals.filter(r => r.status === "completed").length,
    active: referrals.filter(r => r.status === "active").length,
    totalEarned: referrals.filter(r => r.status === "completed").reduce((s, r) => s + r.reward, 0),
  }), [referrals]);

  const currentTier = REWARD_TIERS.reduce((t, tier) => stats.completed >= tier.referrals ? tier : t, REWARD_TIERS[0]);
  const nextTier = REWARD_TIERS.find(t => t.referrals > stats.completed);

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    haptic("success");
    toast.success("Code copié !");
  };

  const shareCode = () => {
    if (navigator.share) {
      navigator.share({ title: "Rejoins Easy-Locs Delivery", text: `Utilise mon code ${referralCode} pour t'inscrire comme livreur et gagne 15 LOCS !`, url: window.location.origin });
    } else copyCode();
  };

  const statusCfg: Record<string, { label: string; color: string; emoji: string }> = {
    pending: { label: "En attente", color: "hsl(var(--warning))", emoji: "⏳" },
    active: { label: "Actif", color: "hsl(var(--info))", emoji: "🚗" },
    completed: { label: "Complété", color: "hsl(var(--success))", emoji: "✅" },
    expired: { label: "Expiré", color: "hsl(var(--destructive))", emoji: "❌" },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Programme de parrainage</h3>
      </div>

      {/* Referral code card */}
      <div className="rounded-xl p-4 text-center space-y-3" style={{ background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.08), hsl(var(--primary) / 0.05))", border: "1px solid hsl(var(--hud-cyan) / 0.15)" }}>
        <Gift className="w-6 h-6 mx-auto" style={{ color: "hsl(var(--hud-cyan))" }} />
        <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Votre code de parrainage</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg font-mono font-bold tracking-wider" style={{ color: "hsl(var(--hud-cyan))" }}>{referralCode}</span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={copyCode}>
            <Copy className="w-3.5 h-3.5" style={{ color: "hsl(var(--hud-text-dim))" }} />
          </Button>
        </div>
        <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
          Chaque filleul qui complète 10 livraisons vous rapporte <strong style={{ color: "hsl(var(--hud-cyan))" }}>15 LOCS</strong>
        </p>
        <Button size="sm" className="text-xs h-8 px-4" onClick={shareCode}
          style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
          <Share2 className="w-3 h-3 mr-1" /> Partager
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Filleuls", value: stats.total, color: "--info" },
          { label: "Actifs", value: stats.active, color: "--hud-cyan" },
          { label: "Complétés", value: stats.completed, color: "--success" },
          { label: "LOCS gagnés", value: stats.totalEarned, color: "--warning" },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tier progress */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>{currentTier.badge}</span>
          {nextTier && <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Prochain: {nextTier.badge}</span>}
        </div>
        {nextTier && (
          <>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(100, (stats.completed / nextTier.referrals) * 100)}%`,
                background: "hsl(var(--hud-cyan))",
              }} />
            </div>
            <p className="text-[8px] text-center" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {stats.completed}/{nextTier.referrals} parrainages — Bonus: {nextTier.bonus} LOCS
            </p>
          </>
        )}
      </div>

      {/* Reward tiers */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {REWARD_TIERS.map(t => (
          <div key={t.level} className="shrink-0 rounded-lg px-3 py-2 text-center min-w-[70px]"
            style={{
              background: stats.completed >= t.referrals ? "hsl(var(--success) / 0.08)" : "hsl(var(--hud-surface))",
              border: `1px solid ${stats.completed >= t.referrals ? "hsl(var(--success) / 0.15)" : "hsl(var(--hud-border) / 0.08)"}`,
            }}>
            <p className="text-[10px]">{t.badge.split(" ")[0]}</p>
            <p className="text-[8px] font-bold" style={{ color: stats.completed >= t.referrals ? "hsl(var(--success))" : "hsl(var(--hud-text-dim))" }}>
              {t.referrals} ref.
            </p>
            <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{t.bonus} LOCS</p>
          </div>
        ))}
      </div>

      {/* Referrals list */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Mes filleuls</p>
        {referrals.map((ref, i) => {
          const cfg = statusCfg[ref.status];
          const progress = (ref.completedDeliveries / ref.requiredDeliveries) * 100;
          return (
            <motion.div key={ref.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}20` }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{cfg.emoji}</span>
                  <div>
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{ref.refereeName}</p>
                    <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                      Rejoint le {new Date(ref.joinedAt).toLocaleDateString("fr")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                  {ref.status === "completed" && <p className="text-[8px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>+{ref.reward} LOCS</p>}
                </div>
              </div>
              {ref.status !== "expired" && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: cfg.color }} />
                  </div>
                  <span className="text-[8px] shrink-0" style={{ color: "hsl(var(--hud-text-dim))" }}>
                    {ref.completedDeliveries}/{ref.requiredDeliveries}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
