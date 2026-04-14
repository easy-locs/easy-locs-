import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  ArrowLeft, TrendingUp, Eye, Heart, Share2, DollarSign,
  Users, BarChart3, Link2, Sparkles, ChevronRight, Plus,
  Star, MessageCircle, ShoppingBag, Zap
} from "lucide-react";

type PeriodKey = "7d" | "30d" | "90d";

const SAMPLE_CONTENT = [
  { id: "1", title: "Summer Collection Guide", type: "guide", views: 1240, likes: 89, earnings: 45.50 },
  { id: "2", title: "Best Restaurants in Dubai", type: "collection", views: 890, likes: 67, earnings: 32.00 },
  { id: "3", title: "Property Tour: Marina View", type: "story", views: 2100, likes: 156, earnings: 78.25 },
  { id: "4", title: "Weekly Fashion Tips", type: "post", views: 560, likes: 42, earnings: 18.75 },
];

const SAMPLE_AFFILIATES = [
  { id: "a1", product: "Premium Kitchen Set", clicks: 45, conversions: 3, earnings: 22.50 },
  { id: "a2", product: "Smart Home Bundle", clicks: 120, conversions: 8, earnings: 64.00 },
  { id: "a3", product: "Travel Backpack", clicks: 78, conversions: 5, earnings: 37.50 },
];

export default function CreatorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>("30d");

  const stats = [
    { label: "Views", value: "4.8K", change: "+12%", icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Likes", value: "354", change: "+8%", icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Shares", value: "89", change: "+15%", icon: Share2, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Earnings", value: "174 AED", change: "+22%", icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const quickActions = [
    { label: "Create Story", icon: Plus, path: "/orbit", color: "bg-primary" },
    { label: "Affiliate Links", icon: Link2, path: "/me/creator/affiliates", color: "bg-purple-500" },
    { label: "Analytics", icon: BarChart3, path: "/me/creator/analytics", color: "bg-blue-500" },
    { label: "Tips History", icon: DollarSign, path: "/me/creator/tips", color: "bg-emerald-500" },
  ];

  return (
    <div className="app-mobile-page app-mobile-content bg-background pb-28">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/me")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted/60"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Creator Studio</h1>
          <p className="text-xs text-muted-foreground">Manage your content & earnings</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10">
          <Star className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] font-bold text-amber-500">Starter</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4 rounded-2xl p-5 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(270 60% 45% / 0.15), hsl(200 80% 50% / 0.08))" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Earnings</p>
            <p className="text-3xl font-extrabold text-foreground">174.50 <span className="text-sm font-bold text-muted-foreground">AED</span></p>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground">Tips</p>
            <p className="text-sm font-bold text-foreground">89.50 AED</p>
          </div>
          <div className="w-px h-6 bg-border/20" />
          <div>
            <p className="text-[10px] text-muted-foreground">Affiliate</p>
            <p className="text-sm font-bold text-foreground">85.00 AED</p>
          </div>
          <div className="w-px h-6 bg-border/20" />
          <div>
            <p className="text-[10px] text-muted-foreground">Followers</p>
            <p className="text-sm font-bold text-foreground">248</p>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-2 px-4 mb-4 overflow-x-auto no-scrollbar">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-center gap-1.5 min-w-[72px] active:scale-95 transition-transform"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${action.color}`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-bold text-foreground">Performance</h2>
          <div className="flex gap-1">
            {(["7d", "30d", "90d"] as PeriodKey[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  period === p ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-xl border border-border/10 bg-card/40 p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stat.bg}`}>
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] font-bold text-emerald-500">{stat.change}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Top Content
          </h2>
        </div>
        <div className="space-y-2">
          {SAMPLE_CONTENT.map((content, idx) => (
            <motion.div
              key={content.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + idx * 0.05 }}
              className="rounded-xl border border-border/10 bg-card/40 p-3 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{content.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Eye className="w-3 h-3" /> {content.views}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Heart className="w-3 h-3" /> {content.likes}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-emerald-500">{content.earnings} AED</p>
                <p className="text-[9px] text-muted-foreground capitalize">{content.type}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-purple-500" /> Affiliate Performance
          </h2>
        </div>
        <div className="space-y-2">
          {SAMPLE_AFFILIATES.map((aff, idx) => (
            <motion.div
              key={aff.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              className="rounded-xl border border-border/10 bg-card/40 p-3 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <Link2 className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{aff.product}</p>
                <p className="text-[10px] text-muted-foreground">{aff.clicks} clicks · {aff.conversions} sales</p>
              </div>
              <p className="text-xs font-bold text-emerald-500 shrink-0">{aff.earnings} AED</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-4">
        <h3 className="text-xs font-bold text-foreground mb-2">Creator Tiers</h3>
        <div className="space-y-2">
          {[
            { tier: "Starter", req: "0 followers", color: "hsl(25 60% 50%)", active: true },
            { tier: "Rising", req: "100+ followers", color: "hsl(220 15% 60%)", active: false },
            { tier: "Established", req: "1K+ followers", color: "hsl(38 92% 50%)", active: false },
            { tier: "Verified", req: "10K+ followers + verification", color: "hsl(270 60% 55%)", active: false },
            { tier: "Partner", req: "50K+ followers + partner program", color: "hsl(200 80% 60%)", active: false },
          ].map((t) => (
            <div
              key={t.tier}
              className="rounded-xl p-3 flex items-center gap-3 border transition-all"
              style={{
                borderColor: t.active ? t.color : "hsl(var(--border) / 0.1)",
                background: t.active ? `${t.color}10` : "transparent",
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${t.color}15` }}>
                <Zap className="w-4 h-4" style={{ color: t.color }} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold" style={{ color: t.active ? t.color : "hsl(var(--foreground))" }}>{t.tier}</p>
                <p className="text-[10px] text-muted-foreground">{t.req}</p>
              </div>
              {t.active && <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Current</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
