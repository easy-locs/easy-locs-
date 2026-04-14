import { memo, useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import { tc, tcp } from "@/lib/i18n-canonical";
import {
  ShoppingBag,
  TrendingUp,
  Tag,
  MessageSquare,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Clock,
  Package,
} from "lucide-react";

interface C2CInsight {
  id: string;
  icon: React.ReactNode;
  emoji: string;
  title: string;
  subtitle: string;
  route: string;
  gradient: string;
  glowColor: string;
  priority: number;
}

function timeGreeting(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

const C2CSmartBanner = memo(() => {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    recentCount: number;
    myActiveCount: number;
    myExpiringCount: number;
    c2cConversations: number;
    trendingCategory: string | null;
    latestListingTitle: string | null;
  } | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

        const queries: Promise<any>[] = [
          db
            .from("marketplace_services")
            .select("id", { count: "exact", head: true })
            .eq("listing_type", "sale")
            .eq("active", true)
            .gte("created_at", oneDayAgo),
          db
            .from("marketplace_services")
            .select("title, category")
            .eq("listing_type", "sale")
            .eq("active", true)
            .order("created_at", { ascending: false })
            .limit(5),
        ];

        if (user?.id) {
          queries.push(
            db
              .from("marketplace_services")
              .select("id", { count: "exact", head: true })
              .eq("listing_type", "sale")
              .eq("active", true)
              .eq("provider_id", user.id),
            db
              .from("marketplace_services")
              .select("id", { count: "exact", head: true })
              .eq("listing_type", "sale")
              .eq("active", true)
              .eq("provider_id", user.id)
              .lte("listing_expires_at", threeDaysFromNow)
              .gte("listing_expires_at", new Date().toISOString()),
            db
              .from("conversations_v2")
              .select("id", { count: "exact", head: true })
              .eq("type", "c2c_exchange")
              .contains("participant_ids", [user.id]),
          );
        }

        const results = await Promise.all(queries);

        const recentCount = !results[0]?.error ? (results[0]?.count ?? 0) : 0;
        const latestListings = !results[1]?.error ? (results[1]?.data ?? []) : [];
        const myActiveCount = user?.id && !results[2]?.error ? (results[2]?.count ?? 0) : 0;
        const myExpiringCount = user?.id && !results[3]?.error ? (results[3]?.count ?? 0) : 0;
        const c2cConversations = user?.id && !results[4]?.error ? (results[4]?.count ?? 0) : 0;

        const catCounts: Record<string, number> = {};
        for (const l of latestListings) {
          if (l.category) catCounts[l.category] = (catCounts[l.category] || 0) + 1;
        }
        const trendingCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        setStats({
          recentCount,
          myActiveCount,
          myExpiringCount,
          c2cConversations,
          trendingCategory,
          latestListingTitle: latestListings[0]?.title || null,
        });
      } catch {
        setStats({
          recentCount: 0,
          myActiveCount: 0,
          myExpiringCount: 0,
          c2cConversations: 0,
          trendingCategory: null,
          latestListingTitle: null,
        });
      }
    })();
  }, [user?.id]);

  const insights = useMemo<C2CInsight[]>(() => {
    if (!stats) return [];
    const items: C2CInsight[] = [];
    const tod = timeGreeting();

    if (stats.myExpiringCount > 0) {
      items.push({
        id: "expiring",
        icon: <Clock className="h-5 w-5 text-amber-300" />,
        emoji: "⏳",
        title: tcp("c2c.expiring_title", stats.myExpiringCount),
        subtitle: tc("c2c.expiring_subtitle"),
        route: "/dashboard/my-shop",
        gradient: "linear-gradient(135deg, hsl(168 50% 20%), hsl(168 45% 16%))",
        glowColor: "hsla(168, 72%, 44%, 0.2)",
        priority: 100,
      });
    }

    if (stats.c2cConversations > 0) {
      items.push({
        id: "messages",
        icon: <MessageSquare className="h-5 w-5 text-blue-300" />,
        emoji: "💬",
        title: tcp("c2c.exchanges_title", stats.c2cConversations),
        subtitle: tc("c2c.exchanges_subtitle"),
        route: "/orbit",
        gradient: "linear-gradient(135deg, hsl(226 30% 18%), hsl(210 50% 16%))",
        glowColor: "hsl(220 70% 55% / 0.2)",
        priority: 90,
      });
    }

    if (stats.recentCount > 0) {
      items.push({
        id: "new-listings",
        icon: <Sparkles className="h-5 w-5 text-emerald-300" />,
        emoji: "🔥",
        title: tcp("c2c.new_listings_title", stats.recentCount),
        subtitle: stats.latestListingTitle
          ? tc("c2c.new_listings_including", { title: stats.latestListingTitle.slice(0, 30) + (stats.latestListingTitle.length > 30 ? "…" : "") })
          : tc("c2c.new_listings_subtitle"),
        route: "/marketplace/c2c",
        gradient: "linear-gradient(135deg, hsl(160 50% 18%), hsl(140 40% 14%))",
        glowColor: "hsla(160, 80%, 50%, 0.15)",
        priority: 70,
      });
    }

    if (stats.myActiveCount > 0) {
      items.push({
        id: "my-listings",
        icon: <Package className="h-5 w-5 text-purple-300" />,
        emoji: "📦",
        title: tcp("c2c.active_title", stats.myActiveCount),
        subtitle: tc("c2c.active_subtitle"),
        route: "/dashboard/my-shop",
        gradient: "linear-gradient(135deg, hsl(270 45% 22%), hsl(260 35% 16%))",
        glowColor: "hsla(270, 70%, 55%, 0.15)",
        priority: 50,
      });
    }

    if (stats.trendingCategory) {
      const catName = stats.trendingCategory.replace(/^c2c_/, "").replace(/_/g, " ");
      items.push({
        id: "trending",
        icon: <TrendingUp className="h-5 w-5 text-rose-300" />,
        emoji: "📈",
        title: tc("c2c.trending_title", { category: catName.charAt(0).toUpperCase() + catName.slice(1) }),
        subtitle: tc("c2c.trending_subtitle"),
        route: "/marketplace/c2c",
        gradient: "linear-gradient(135deg, hsl(340 55% 20%), hsl(350 45% 15%))",
        glowColor: "hsla(340, 80%, 55%, 0.15)",
        priority: 40,
      });
    }

    const sellCTA: C2CInsight = {
      id: "sell-cta",
      icon: <Tag className="h-5 w-5 text-yellow-300" />,
      emoji: tod === "morning" ? "☀️" : tod === "afternoon" ? "🛒" : "🌙",
      title: tod === "morning"
        ? tc("c2c.sell_morning")
        : tod === "afternoon"
          ? tc("c2c.sell_afternoon")
          : tc("c2c.sell_evening"),
      subtitle: tc("c2c.sell_subtitle"),
      route: "/dashboard/create-listing",
      gradient: "linear-gradient(135deg, hsl(168 50% 18%), hsl(168 42% 14%))",
      glowColor: "hsla(168, 72%, 44%, 0.15)",
      priority: 30,
    };
    items.push(sellCTA);

    items.sort((a, b) => b.priority - a.priority);
    return items.slice(0, 3);
  }, [stats]);

  useEffect(() => {
    if (insights.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((i) => (i + 1) % insights.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [insights.length]);

  if (!stats || insights.length === 0) return null;

  const active = insights[activeIdx % insights.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ marginBottom: "var(--section-gap-compact, 12px)" }}
    >
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/60">
              {tc("c2c.banner_label")}
            </span>
          </div>
          {insights.length > 1 && (
            <div className="flex gap-1" role="tablist" aria-label={tc("c2c.banner_label")}>
              {insights.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  aria-label={`${tc("c2c.banner_label")} ${i + 1}`}
                  aria-selected={i === activeIdx % insights.length}
                  role="tab"
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === activeIdx % insights.length ? "bg-amber-500" : "bg-foreground/15"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Link
              to={active.route}
              className="relative block overflow-hidden rounded-2xl border border-white/[0.06] active:scale-[0.98] transition-transform hover:brightness-110"
              style={{ background: active.gradient }}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 85% 25%, ${active.glowColor}, transparent 65%)` }}
                animate={{ opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />

              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(105deg, transparent 40%, hsla(0,0%,100%,0.05) 50%, transparent 60%)" }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
              />

              <div className="relative z-10 p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <span className="text-lg">{active.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white leading-tight truncate">
                    {active.title}
                  </p>
                  <p className="text-[11px] text-white/65 mt-0.5 truncate font-medium">
                    {active.subtitle}
                  </p>
                </div>
                <div className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <ArrowRight className="h-3.5 w-3.5 text-white/80" />
                </div>
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

C2CSmartBanner.displayName = "C2CSmartBanner";
export default C2CSmartBanner;
