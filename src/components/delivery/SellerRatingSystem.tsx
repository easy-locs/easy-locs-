/**
 * SellerRatingSystem — OOO. Seller Rating System
 * Seller badges, trust score, performance ranking, buyer confidence metrics.
 * PASS94-OOO
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Shield, Award, TrendingUp, Users, Clock, CheckCircle2, ThumbsUp } from "lucide-react";

interface SellerProfile {
  id: string;
  name: string;
  avatar: string;
  trustScore: number;
  totalSales: number;
  totalReviews: number;
  avgRating: number;
  responseTime: number; // minutes
  completionRate: number;
  memberSince: string;
  badges: Badge[];
  recentReviews: Review[];
  monthlyStats: MonthlyStat[];
}

interface Badge {
  id: string;
  label: string;
  emoji: string;
  description: string;
  earnedAt: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

interface Review {
  id: string;
  buyer: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
}

interface MonthlyStat {
  month: string;
  sales: number;
  rating: number;
  responseTime: number;
}

const MOCK_SELLER: SellerProfile = {
  id: "s1", name: "Boutique Express", avatar: "🏪",
  trustScore: 92, totalSales: 847, totalReviews: 312, avgRating: 4.7,
  responseTime: 12, completionRate: 98.5, memberSince: "2024-06-15",
  badges: [
    { id: "b1", label: "Top Seller", emoji: "🏆", description: "Plus de 500 ventes réussies", earnedAt: "2025-11-01", tier: "gold" },
    { id: "b2", label: "Réponse Éclair", emoji: "⚡", description: "Temps de réponse < 15 min", earnedAt: "2026-01-15", tier: "platinum" },
    { id: "b3", label: "5 Étoiles", emoji: "⭐", description: "Note moyenne > 4.5 sur 100+ avis", earnedAt: "2025-08-20", tier: "gold" },
    { id: "b4", label: "Zéro Litige", emoji: "🛡️", description: "Aucun litige sur 200+ commandes", earnedAt: "2026-02-01", tier: "silver" },
    { id: "b5", label: "Éco-Responsable", emoji: "🌱", description: "50%+ livraisons véhicules électriques", earnedAt: "2026-03-01", tier: "bronze" },
  ],
  recentReviews: [
    { id: "r1", buyer: "Alice M.", rating: 5, comment: "Livraison rapide et colis parfait !", date: "2026-03-15", verified: true },
    { id: "r2", buyer: "Bruno C.", rating: 4, comment: "Bon service, léger retard mais bien communiqué.", date: "2026-03-14", verified: true },
    { id: "r3", buyer: "Claire D.", rating: 5, comment: "Excellent ! Emballage soigné.", date: "2026-03-12", verified: true },
    { id: "r4", buyer: "David R.", rating: 5, comment: "Parfait comme toujours.", date: "2026-03-10", verified: true },
    { id: "r5", buyer: "Emma F.", rating: 3, comment: "Produit OK mais emballage abîmé.", date: "2026-03-08", verified: false },
  ],
  monthlyStats: [
    { month: "Jan", sales: 62, rating: 4.6, responseTime: 15 },
    { month: "Fév", sales: 78, rating: 4.7, responseTime: 13 },
    { month: "Mar", sales: 95, rating: 4.8, responseTime: 11 },
  ],
};

export default function SellerRatingSystem({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<"overview" | "badges" | "reviews" | "ranking">("overview");
  const seller = MOCK_SELLER;

  const tierColor: Record<string, string> = {
    bronze: "hsl(30, 50%, 50%)",
    silver: "hsl(0, 0%, 65%)",
    gold: "hsl(45, 90%, 50%)",
    platinum: "hsl(200, 80%, 60%)",
  };

  const scoreColor = seller.trustScore >= 90 ? "hsl(var(--success))" : seller.trustScore >= 70 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Réputation Vendeur</h3>
      </div>

      {/* Trust Score */}
      <div className="rounded-xl p-4 text-center" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${scoreColor}20` }}>
        <p className="text-3xl font-black" style={{ color: scoreColor }}>{seller.trustScore}</p>
        <p className="text-[10px] font-semibold mt-1" style={{ color: "hsl(var(--hud-text))" }}>Score de Confiance</p>
        <div className="flex justify-center gap-4 mt-2">
          <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>⭐ {seller.avgRating} moy.</span>
          <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>📦 {seller.totalSales} ventes</span>
          <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>💬 {seller.totalReviews} avis</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Note moy.", value: `${seller.avgRating}`, color: "--warning" },
          { label: "Réponse", value: `${seller.responseTime}m`, color: "--info" },
          { label: "Complétion", value: `${seller.completionRate}%`, color: "--success" },
          { label: "Badges", value: seller.badges.length, color: "--hud-cyan" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[7px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "overview" as const, label: "📊 Vue" },
          { id: "badges" as const, label: "🏅 Badges" },
          { id: "reviews" as const, label: "⭐ Avis" },
          { id: "ranking" as const, label: "🏆 Classement" },
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
        {tab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>Tendance mensuelle</p>
              {seller.monthlyStats.map(m => (
                <div key={m.month} className="flex items-center justify-between text-[9px]">
                  <span style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{m.month} 2026</span>
                  <div className="flex gap-3">
                    <span style={{ color: "hsl(var(--info))" }}>📦 {m.sales}</span>
                    <span style={{ color: "hsl(var(--warning))" }}>⭐ {m.rating}</span>
                    <span style={{ color: "hsl(var(--success))" }}>⚡ {m.responseTime}m</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3" style={{ background: "hsl(var(--success) / 0.04)", border: "1px solid hsl(var(--success) / 0.1)" }}>
              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--success))" }}>📈 Performance en hausse</p>
              <p className="text-[9px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                +22% de ventes et temps de réponse réduit de 27% ce trimestre.
              </p>
            </div>
          </motion.div>
        )}

        {tab === "badges" && (
          <motion.div key="badges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {seller.badges.map(b => (
              <div key={b.id} className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${tierColor[b.tier]}20` }}>
                <span className="text-xl">{b.emoji}</span>
                <div className="flex-1">
                  <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{b.label}</p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{b.description}</p>
                </div>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${tierColor[b.tier]}15`, color: tierColor[b.tier] }}>
                  {b.tier.toUpperCase()}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        {tab === "reviews" && (
          <motion.div key="reviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {seller.recentReviews.map(r => (
              <div key={r.id} className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-[10px]">{i < r.rating ? "⭐" : "☆"}</span>
                    ))}
                  </div>
                  <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{r.buyer}</span>
                  {r.verified && <CheckCircle2 className="h-2.5 w-2.5" style={{ color: "hsl(var(--success))" }} />}
                  <span className="text-[8px] ml-auto" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{r.date}</span>
                </div>
                <p className="text-[9px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{r.comment}</p>
              </div>
            ))}
          </motion.div>
        )}

        {tab === "ranking" && (
          <motion.div key="ranking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <p className="text-[10px] font-bold px-1" style={{ color: "hsl(var(--hud-text))" }}>Classement vendeurs</p>
            {[
              { rank: 1, name: "Boutique Express", score: 92, emoji: "🥇" },
              { rank: 2, name: "LivraFast Pro", score: 88, emoji: "🥈" },
              { rank: 3, name: "ParisShip", score: 85, emoji: "🥉" },
              { rank: 4, name: "QuickDeliver", score: 79, emoji: "4" },
              { rank: 5, name: "MétroExpress", score: 76, emoji: "5" },
            ].map(r => (
              <div key={r.rank} className="rounded-lg px-3 py-2 flex items-center gap-3"
                style={{
                  background: r.rank === 1 ? "hsl(var(--warning) / 0.06)" : "hsl(var(--hud-surface))",
                  border: `1px solid ${r.rank === 1 ? "hsl(var(--warning) / 0.12)" : "hsl(var(--hud-border) / 0.06)"}`,
                }}>
                <span className="text-sm w-6 text-center">{r.emoji}</span>
                <p className="text-[10px] font-semibold flex-1" style={{ color: "hsl(var(--hud-text))" }}>{r.name}</p>
                <span className="text-[10px] font-bold" style={{ color: r.score >= 90 ? "hsl(var(--success))" : "hsl(var(--info))" }}>{r.score}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
