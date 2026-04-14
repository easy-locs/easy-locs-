import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap, UtensilsCrossed, ShoppingCart, Wrench, Car, Send, Plane, Building2, Wallet, MessageCircle, Globe, Shield, CreditCard, Users, Activity, MapPin, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect, useMemo } from "react";
import { useRadar } from "@/hooks/useRadar";
import { useI18n } from "@/lib/i18n";
import EasyLocsLogo from "@/components/brand/EasyLocsLogo";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";

const UNIVERSES = [
  { icon: UtensilsCrossed, label: "Food", color: "hsl(15 75% 52%)", bg: "hsl(15 75% 52% / 0.12)", to: "/food" },
  { icon: ShoppingCart, label: "Grocery", color: "hsl(142 55% 42%)", bg: "hsl(142 55% 42% / 0.12)", to: "/grocery" },
  { icon: Wrench, label: "Services", color: "hsl(210 70% 52%)", bg: "hsl(210 70% 52% / 0.12)", to: "/services-hub" },
  { icon: Car, label: "Ride", color: "hsl(270 55% 55%)", bg: "hsl(270 55% 55% / 0.12)", to: "/mobility/taxi" },
  { icon: Send, label: "Send", color: "hsl(190 65% 42%)", bg: "hsl(190 65% 42% / 0.12)", to: "/wallet/transfer" },
  { icon: Plane, label: "Travel", color: "hsl(250 60% 55%)", bg: "hsl(250 60% 55% / 0.12)", to: "/travel" },
  { icon: Building2, label: "Property", color: "hsl(168 60% 40%)", bg: "hsl(168 60% 40% / 0.12)", to: "/property-hub" },
  { icon: Wallet, label: "Wallet", color: "hsl(152 60% 42%)", bg: "hsl(152 60% 42% / 0.12)", to: "/wallet" },
  { icon: MessageCircle, label: "Orbit", color: "hsl(210 75% 52%)", bg: "hsl(210 75% 52% / 0.12)", to: "/orbit" },
];

const FLOATING_CARDS = [
  { title: "Pizza Napoli", sub: "\u2B50 4.8 \u00B7 Marina \u00B7 1.8 km \u00B7 7 min", emoji: "\uD83C\uDF55", accent: "hsl(15 75% 52%)", badge: "\uD83D\uDD25 Nearby", to: "/food" },
  { title: "Book a Stay", sub: "Dubai \u00B7 3 nights \u00B7 from 89$/night", emoji: "\uD83C\uDFE8", accent: "hsl(250 60% 55%)", to: "/travel" },
  { title: "Get a Ride", sub: "Pickup in 3 min", emoji: "\uD83D\uDE97", accent: "hsl(270 55% 55%)", badge: "\u26A1 Fast", to: "/mobility/taxi" },
  { title: "+ 45 received", sub: "Wallet \u00B7 Instant transfer", emoji: "\uD83D\uDCB8", accent: "hsl(152 60% 42%)", badge: "\u2705 Done", to: "/wallet" },
  { title: "Rent Property", sub: "Dakar \u00B7 450\u20AC/mo \u00B7 24h approval", emoji: "\uD83C\uDFE0", accent: "hsl(168 60% 40%)", to: "/property-hub" },
  { title: "Plumber Pro", sub: "\u2B50 4.9 \u00B7 1.2km \u00B7 Available now", emoji: "\uD83D\uDD27", accent: "hsl(210 70% 52%)", badge: "Nearby", to: "/services-hub" },
];

const INTENTS = [
  { key: "consumer", headline: "One platform. Everything around you. Instantly.", sub: "Order, ride, send, pay \u2014 zero fees for you.", cta: "Start now \u2014 free" },
  { key: "business", headline: "Earn money with your city.", sub: "Open a shop, get customers instantly, accept payments.", cta: "Launch your business" },
  { key: "property", headline: "Rent. Manage. Grow.", sub: "The smartest property management platform.", cta: "List your property" },
  { key: "services", headline: "Your skills. Clients nearby.", sub: "Get discovered by thousands of users.", cta: "Offer your services" },
];

const SPEED_STATS = [
  { emoji: "\u26A1", label: "Taxi in 3 min", color: "hsl(var(--accent))" },
  { emoji: "\uD83C\uDF55", label: "Food in 12 min", color: "hsl(15 75% 52%)" },
  { emoji: "\uD83C\uDFE0", label: "Rent in 24h", color: "hsl(168 60% 40%)" },
];

const VALUE_PROPS = [
  { val: "0%", label: "Zero fees for clients", sub: "No hidden charges, ever", accent: "hsl(var(--success))" },
  { val: "5%", label: "Platform only", sub: "vs 30% elsewhere", accent: "hsl(var(--accent))" },
  { val: "Direct", label: "Price from source", sub: "Owner, shop, driver", accent: "hsl(200 70% 50%)" },
];

function useLiveStats() {
  const stats = useMemo(() => ({ users: 120_000, processed: 2.4, txPerMin: 12 }), []);
  return stats;
}

const Hero = () => {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [intentIdx, setIntentIdx] = useState(0);
  const liveStats = useLiveStats();
  const { radar, formatETA } = useRadar({ type: "taxi" });

  const INTENTS_I18N = useMemo(() => [
    { key: "consumer", headline: t("landing.hero.intent_consumer") || "One platform. Everything around you. Instantly.", sub: t("landing.hero.intent_consumer_sub") || "Order, ride, send, pay \u2014 zero fees for you.", cta: t("landing.hero.cta_start") || "Start now \u2014 free" },
    { key: "business", headline: t("landing.hero.intent_business") || "Earn money with your city.", sub: t("landing.hero.intent_business_sub") || "Open a shop, get customers instantly, accept payments.", cta: t("landing.hero.intent_business_cta") || "Launch your business" },
    { key: "property", headline: t("landing.hero.intent_property") || "Rent. Manage. Grow.", sub: t("landing.hero.intent_property_sub") || "The smartest property management platform.", cta: t("landing.hero.intent_property_cta") || "List your property" },
    { key: "services", headline: t("landing.hero.intent_services") || "Your skills. Clients nearby.", sub: t("landing.hero.intent_services_sub") || "Get discovered by thousands of users.", cta: t("landing.hero.intent_services_cta") || "Offer your services" },
  ], [t]);

  const intent = INTENTS_I18N[intentIdx];

  useEffect(() => {
    const iv = setInterval(() => setIntentIdx(i => (i + 1) % INTENTS.length), 6000);
    return () => clearInterval(iv);
  }, []);

  return (
    <section
      aria-label="Hero"
      className="relative overflow-hidden pt-14 sm:pt-20"
      style={{ background: "linear-gradient(160deg, hsl(225 28% 4%) 0%, hsl(225 25% 7%) 35%, hsl(225 22% 12%) 65%, hsl(225 26% 6%) 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] left-[15%] w-[500px] h-[500px] lg:w-[900px] lg:h-[900px] rounded-full" style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.08) 0%, transparent 55%)" }} />
        <div className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] lg:w-[700px] lg:h-[700px] rounded-full" style={{ background: "radial-gradient(circle, hsl(var(--info) / 0.05) 0%, transparent 55%)" }} />
        {!isMobile && (
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `linear-gradient(hsl(var(--accent) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.5) 1px, transparent 1px)`, backgroundSize: "80px 80px" }} />
        )}
        {!isMobile && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: "conic-gradient(from 0deg, transparent, hsl(var(--accent) / 0.04) 30deg, transparent 60deg)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-16 lg:py-20 xl:py-28">

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hidden sm:flex items-center justify-center gap-2 sm:gap-4 mb-5 sm:mb-8 flex-wrap overflow-hidden"
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border shrink-0 max-w-[48%] sm:max-w-none" style={{ background: "hsl(225 25% 7% / 0.6)", borderColor: "hsl(210 18% 90% / 0.06)" }}>
            <Users className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--accent) / 0.6)" }} />
            <span className="text-[10px] sm:text-[11px] font-bold line-clamp-1 break-words" style={{ color: "hsl(var(--accent))" }}>
              {liveStats.users.toLocaleString()}+ {t("landing.hero.users") || "users"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border shrink-0 max-w-[48%] sm:max-w-none" style={{ background: "hsl(225 25% 7% / 0.6)", borderColor: "hsl(var(--success) / 0.1)" }}>
            <TrendingUp className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--success))" }} />
            <span className="text-[10px] sm:text-[11px] font-bold line-clamp-1 break-words" style={{ color: "hsl(var(--success))" }}>
              ${liveStats.processed}M {t("landing.hero.processed") || "processed"}
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
          <div className="lg:col-span-7 space-y-3 sm:space-y-5 lg:space-y-7 text-center lg:text-left">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="flex flex-col items-center lg:items-start gap-3">
              <Link to="/" aria-label="Easy-Locs Home">
                <EasyLocsLogo variant="full" size="lg" animate />
              </Link>
              <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] sm:text-[11px] font-semibold border" style={{ background: "linear-gradient(135deg, hsl(var(--accent) / 0.1), hsl(var(--accent) / 0.03))", borderColor: "hsl(var(--accent) / 0.2)", color: "hsl(var(--gold-light))" }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "hsl(var(--success))" }} />
                </span>
                {t("landing.hero.live_badge") || "Live in 190+ countries"}
              </span>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.h1
                key={intent.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6 }}
                className="text-[1.7rem] sm:text-4xl lg:text-[2.8rem] xl:text-5xl font-extrabold tracking-tight leading-[1.08]"
                style={{ color: "hsl(210 20% 97%)" }}
              >
                {intent.headline.split(".").filter(Boolean).map((seg, i, arr) => (
                  <span key={i}>
                    {i === 0 ? (
                      <span className="text-gradient-gold">{seg.trim()}</span>
                    ) : (
                      <span>{seg.trim()}</span>
                    )}
                    {i < arr.length - 1 && ". "}
                  </span>
                ))}
                <br />
                <span style={{ color: "hsl(215 15% 62%)" }} className="text-xl sm:text-2xl lg:text-3xl xl:text-[2.2rem] font-bold">
                  {intent.sub}
                </span>
              </motion.h1>
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="hidden sm:flex items-center justify-center lg:justify-start gap-2 flex-wrap overflow-hidden"
            >
              {SPEED_STATS.map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border text-[10px] sm:text-xs font-semibold shrink-0"
                  style={{ background: "hsl(225 25% 7% / 0.5)", borderColor: "hsl(210 18% 90% / 0.06)", color: s.color }}>
                  {s.emoji} {s.label}
                </span>
              ))}
              {radar && radar.availableCount > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border text-[10px] sm:text-xs font-semibold shrink-0"
                  style={{ background: "hsl(var(--success) / 0.08)", borderColor: "hsl(var(--success) / 0.15)", color: "hsl(var(--success))" }}
                >
                  \uD83D\uDE95 {radar.availableCount} nearby
                </motion.span>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="w-full max-w-lg mx-auto lg:mx-0">
              <UnifiedSearchBar variant="hero" placeholder="Search food, hotels, shops, services, rides..." />
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-wrap gap-1.5 justify-center lg:justify-start pb-1">
              {UNIVERSES.map((u, i) => (
                <motion.div key={u.label} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45 + i * 0.03 }}>
                  <Link to={u.to} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold border shrink-0 active:scale-95 transition-transform" style={{ background: u.bg, borderColor: `${u.color}25`, color: u.color }}>
                    <u.icon className="h-3 w-3 shrink-0" />{u.label}
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-2.5">
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/signup" className="group inline-flex items-center justify-center gap-2 h-11 sm:h-12 px-7 sm:px-9 rounded-2xl text-sm font-bold relative overflow-hidden w-full sm:w-auto" style={{ background: "var(--gradient-gold)", color: "hsl(var(--accent-foreground))", boxShadow: "0 0 35px hsl(var(--accent) / 0.25), 0 4px 16px hsl(0 0% 0% / 0.2)" }}>
                  <Zap className="h-3.5 w-3.5" />{intent.cta}<ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/business" className="inline-flex items-center justify-center gap-2 h-11 sm:h-12 px-6 sm:px-7 rounded-2xl text-sm font-semibold border w-full sm:w-auto" style={{ borderColor: "hsl(210 18% 75% / 0.1)", color: "hsl(210 18% 75%)", background: "hsl(210 18% 75% / 0.04)" }}>
                  {t("landing.hero.launch_business") || "Launch your business in minutes"}
                </Link>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="hidden sm:flex items-center justify-center lg:justify-start gap-5 pt-1">
              {[
                { icon: Globe, val: "190+", lbl: t("landing.hero.stat_countries") || "Countries" },
                { icon: Shield, val: "0%", lbl: t("landing.hero.stat_commission") || "Commission" },
                { icon: CreditCard, val: "120+", lbl: t("landing.hero.stat_currencies") || "Currencies" },
              ].map((s) => (
                <div key={s.lbl} className="flex items-center gap-1.5">
                  <s.icon className="h-3 w-3" style={{ color: "hsl(var(--accent) / 0.6)" }} />
                  <span className="text-xs font-extrabold" style={{ color: "hsl(var(--accent))" }}>{s.val}</span>
                  <span className="text-[10px] font-medium" style={{ color: "hsl(215 15% 45%)" }}>{s.lbl}</span>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="flex items-center gap-2 sm:gap-3 pt-2 flex-wrap overflow-hidden"
            >
              {VALUE_PROPS.map((vp) => (
                <div
                  key={vp.val}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border min-w-0 shrink-0"
                  style={{
                    background: "hsl(225 25% 7% / 0.7)",
                    borderColor: `${vp.accent}25`,
                  }}
                >
                  <span className="text-base sm:text-lg font-extrabold tabular-nums shrink-0" style={{ color: vp.accent }}>{vp.val}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-bold leading-tight truncate" style={{ color: "hsl(210 20% 94%)" }}>{vp.label}</p>
                    <p className="text-[10px] sm:text-[10px] font-medium truncate" style={{ color: "hsl(215 15% 50%)" }}>{vp.sub}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="hidden sm:flex items-center justify-center lg:justify-start gap-1 overflow-x-auto scrollbar-none pb-1">
              {INTENTS.map((it, i) => (
                <button
                  key={it.key}
                  onClick={() => setIntentIdx(i)}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[10px] font-semibold border transition-all duration-200 shrink-0 whitespace-nowrap"
                  style={{
                    background: i === intentIdx ? "hsl(var(--accent) / 0.12)" : "transparent",
                    borderColor: i === intentIdx ? "hsl(var(--accent) / 0.3)" : "hsl(210 18% 90% / 0.06)",
                    color: i === intentIdx ? "hsl(var(--accent))" : "hsl(215 15% 50%)",
                  }}
                >
                  {it.key === "consumer" ? "\uD83D\uDED2 Consumer" : it.key === "business" ? "\uD83C\uDFEA Business" : it.key === "property" ? "\uD83C\uDFE0 Property" : "\uD83D\uDD27 Services"}
                </button>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="lg:col-span-5 hidden md:block"
          >
            <div className="relative w-full max-w-md mx-auto lg:max-w-none">
              <div className="grid grid-cols-2 gap-2.5">
                {FLOATING_CARDS.map((card, i) => (
                  <Link key={card.title} to={card.to}>
                    <motion.div
                      className="rounded-2xl border p-3.5 cursor-pointer relative"
                      style={{
                        background: "linear-gradient(145deg, hsl(225 22% 12% / 0.9), hsl(225 22% 8% / 0.95))",
                        borderColor: "hsl(210 18% 90% / 0.06)",
                        boxShadow: `0 4px 20px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(220 20% 90% / 0.04)`,
                      }}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                      whileHover={{ scale: 1.05, y: -3 }}
                    >
                      {card.badge && (
                        <span className="absolute -top-1.5 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
                          background: `${card.accent}20`,
                          color: card.accent,
                          border: `1px solid ${card.accent}30`,
                        }}>
                          {card.badge}
                        </span>
                      )}
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{card.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold line-clamp-1 break-words" style={{ color: "hsl(210 20% 94%)" }}>{card.title}</p>
                          <p className="text-[10px] line-clamp-2 break-words" style={{ color: "hsl(215 15% 50%)" }}>{card.sub}</p>
                        </div>
                      </div>
                      <div className="mt-2 h-0.5 rounded-full" style={{ background: `${card.accent}40`, width: `${60 + i * 8}%` }} />
                    </motion.div>
                  </Link>
                ))}
              </div>

              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full -z-10"
                style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.12), transparent 70%)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />

              <motion.div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full border"
                style={{ background: "hsl(225 22% 9% / 0.95)", borderColor: "hsl(var(--success) / 0.2)" }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: "hsl(var(--success))" }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: "hsl(var(--success))" }} />
                  {liveStats.txPerMin} {t("landing.hero.tx_last_minute") || "transactions in the last minute"}
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background via-background/50 to-transparent" />
    </section>
  );
};

export default Hero;
