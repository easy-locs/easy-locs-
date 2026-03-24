import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap, UtensilsCrossed, ShoppingCart, Wrench, Car, Send, Plane, Building2, Wallet, MessageCircle, Globe, Shield, CreditCard, Users, Activity, MapPin, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect, useMemo } from "react";
import { useRadar } from "@/hooks/useRadar";

const UNIVERSES = [
  { icon: UtensilsCrossed, label: "Food", color: "hsl(15 80% 55%)", bg: "hsl(15 80% 55% / 0.12)" },
  { icon: ShoppingCart, label: "Grocery", color: "hsl(142 60% 45%)", bg: "hsl(142 60% 45% / 0.12)" },
  { icon: Wrench, label: "Services", color: "hsl(220 70% 55%)", bg: "hsl(220 70% 55% / 0.12)" },
  { icon: Car, label: "Ride", color: "hsl(270 60% 55%)", bg: "hsl(270 60% 55% / 0.12)" },
  { icon: Send, label: "Send", color: "hsl(190 70% 45%)", bg: "hsl(190 70% 45% / 0.12)" },
  { icon: Plane, label: "Travel", color: "hsl(250 65% 55%)", bg: "hsl(250 65% 55% / 0.12)" },
  { icon: Building2, label: "Property", color: "hsl(38 65% 50%)", bg: "hsl(38 65% 50% / 0.12)" },
  { icon: Wallet, label: "Wallet", color: "hsl(152 60% 42%)", bg: "hsl(152 60% 42% / 0.12)" },
  { icon: MessageCircle, label: "Orbit", color: "hsl(210 80% 52%)", bg: "hsl(210 80% 52% / 0.12)" },
];

const FLOATING_CARDS = [
  { title: "Pizza Napoli", sub: "⭐ 4.8 · Marina · 1.8 km · 7 min", emoji: "🍕", accent: "hsl(15 80% 55%)", badge: "🔥 Nearby" },
  { title: "Book a Stay", sub: "Dubai · 3 nights · from 89$/night", emoji: "🏨", accent: "hsl(250 65% 55%)" },
  { title: "Get a Ride", sub: "Pickup in 3 min", emoji: "🚗", accent: "hsl(270 60% 55%)", badge: "⚡ Fast" },
  { title: "+ 45 received", sub: "Wallet · Instant transfer", emoji: "💸", accent: "hsl(152 60% 42%)", badge: "✅ Done" },
  { title: "Rent Property", sub: "Dakar · 450€/mo · 24h approval", emoji: "🏠", accent: "hsl(38 65% 50%)" },
  { title: "Plumber Pro", sub: "⭐ 4.9 · 1.2km · Available now", emoji: "🔧", accent: "hsl(220 70% 55%)", badge: "Nearby" },
];

const INTENTS = [
  { key: "consumer", headline: "One platform. Everything around you. Instantly.", sub: "Order, ride, send, pay — all in one app.", cta: "Start now — free" },
  { key: "business", headline: "Earn money with your city.", sub: "Open a shop, get customers instantly, accept payments.", cta: "Launch your business" },
  { key: "property", headline: "Rent. Manage. Grow.", sub: "The smartest property management platform.", cta: "List your property" },
  { key: "services", headline: "Your skills. Clients nearby.", sub: "Get discovered by thousands of users.", cta: "Offer your services" },
];

const SPEED_STATS = [
  { emoji: "⚡", label: "Taxi in 3 min", color: "hsl(var(--hud-primary))" },
  { emoji: "🍕", label: "Food in 12 min", color: "hsl(15 80% 55%)" },
  { emoji: "🏠", label: "Rent in 24h", color: "hsl(38 65% 50%)" },
];

/** Simulated live stats with gentle increments */
function useLiveStats() {
  // Static values — no interval to prevent continuous re-renders / flicker
  const stats = useMemo(() => ({ users: 120_000, processed: 2.4, txPerMin: 12 }), []);
  return stats;
}

const Hero = () => {
  const isMobile = useIsMobile();
  const [intentIdx, setIntentIdx] = useState(0);
  const intent = INTENTS[intentIdx];
  const liveStats = useLiveStats();
  const { radar, formatETA } = useRadar({ type: "taxi" });

  // Rotate intent every 6s
  useEffect(() => {
    const iv = setInterval(() => setIntentIdx(i => (i + 1) % INTENTS.length), 6000);
    return () => clearInterval(iv);
  }, []);

  return (
    <section
      aria-label="Hero"
      className="relative overflow-hidden pt-16 sm:pt-20"
      style={{ background: "linear-gradient(160deg, hsl(222 50% 4%) 0%, hsl(220 48% 8%) 35%, hsl(222 42% 13%) 65%, hsl(220 38% 7%) 100%)" }}
    >
      {/* Ambient orbs */}
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 xl:py-28">

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-2 sm:gap-4 mb-5 sm:mb-8 flex-wrap overflow-hidden"
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border shrink-0 max-w-[48%] sm:max-w-none" style={{ background: "hsl(220 40% 8% / 0.6)", borderColor: "hsl(220 15% 90% / 0.06)" }}>
            <Users className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--accent) / 0.6)" }} />
            <span className="text-[9px] sm:text-[11px] font-bold truncate" style={{ color: "hsl(var(--accent))" }}>
              {liveStats.users.toLocaleString()}+ users
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border shrink-0 max-w-[48%] sm:max-w-none" style={{ background: "hsl(220 40% 8% / 0.6)", borderColor: "hsl(var(--success) / 0.1)" }}>
            <TrendingUp className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--success))" }} />
            <span className="text-[9px] sm:text-[11px] font-bold truncate" style={{ color: "hsl(var(--success))" }}>
              ${liveStats.processed}M processed
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
          {/* LEFT */}
          <div className="lg:col-span-7 space-y-5 lg:space-y-7 text-center lg:text-left">
            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="flex justify-center lg:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] sm:text-[11px] font-semibold border backdrop-blur-xl" style={{ background: "linear-gradient(135deg, hsl(var(--accent) / 0.1), hsl(var(--accent) / 0.03))", borderColor: "hsl(var(--accent) / 0.2)", color: "hsl(var(--gold-light))" }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "hsl(var(--success))" }} />
                </span>
                Easy-Locs · Live in 190+ countries
              </span>
            </motion.div>

            {/* Headline */}
            <AnimatePresence mode="wait">
              <motion.h1
                key={intent.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6 }}
                className="text-[1.7rem] sm:text-4xl lg:text-[2.8rem] xl:text-5xl font-extrabold tracking-tight leading-[1.08]"
                style={{ color: "hsl(40 50% 97%)" }}
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
                <span style={{ color: "hsl(220 15% 65%)" }} className="text-xl sm:text-2xl lg:text-3xl xl:text-[2.2rem] font-bold">
                  {intent.sub}
                </span>
              </motion.h1>
            </AnimatePresence>

            {/* Speed stats strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="flex items-center justify-center lg:justify-start gap-2 flex-wrap overflow-hidden"
            >
              {SPEED_STATS.map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border text-[10px] sm:text-xs font-semibold shrink-0"
                  style={{ background: "hsl(220 40% 8% / 0.5)", borderColor: "hsl(220 15% 90% / 0.06)", color: s.color }}>
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
                  🚕 {radar.availableCount} nearby
                </motion.span>
              )}
            </motion.div>

            {/* Universe chips */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-wrap justify-center lg:justify-start gap-1 sm:gap-1.5 overflow-hidden">
              {UNIVERSES.map((u, i) => (
                <motion.span key={u.label} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45 + i * 0.03 }} className="inline-flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-semibold border shrink-0" style={{ background: u.bg, borderColor: `${u.color}25`, color: u.color }}>
                  <u.icon className="h-2.5 w-2.5 shrink-0" />{u.label}
                </motion.span>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-2.5">
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/signup" className="group inline-flex items-center justify-center gap-2 h-11 sm:h-12 px-7 sm:px-9 rounded-2xl text-sm font-bold relative overflow-hidden w-full sm:w-auto" style={{ background: "var(--gradient-gold)", color: "hsl(var(--accent-foreground))", boxShadow: "0 0 35px hsl(var(--accent) / 0.25), 0 4px 16px hsl(0 0% 0% / 0.2)" }}>
                  <Zap className="h-3.5 w-3.5" />{intent.cta}<ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/business" className="inline-flex items-center justify-center gap-2 h-11 sm:h-12 px-6 sm:px-7 rounded-2xl text-sm font-semibold border w-full sm:w-auto" style={{ borderColor: "hsl(220 15% 75% / 0.1)", color: "hsl(220 15% 75%)", background: "hsl(220 15% 75% / 0.04)" }}>
                  Launch your business in minutes
                </Link>
              </motion.div>
            </motion.div>

            {/* Trust strip */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex items-center justify-center lg:justify-start gap-5 pt-1">
              {[
                { icon: Globe, val: "190+", lbl: "Countries" },
                { icon: Shield, val: "0%", lbl: "Commission" },
                { icon: CreditCard, val: "120+", lbl: "Currencies" },
              ].map((s) => (
                <div key={s.lbl} className="flex items-center gap-1.5">
                  <s.icon className="h-3 w-3" style={{ color: "hsl(var(--accent) / 0.6)" }} />
                  <span className="text-xs font-extrabold" style={{ color: "hsl(var(--accent))" }}>{s.val}</span>
                  <span className="text-[10px] font-medium" style={{ color: "hsl(220 15% 45%)" }}>{s.lbl}</span>
                </div>
              ))}
            </motion.div>

            {/* Intent selector */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex items-center justify-center lg:justify-start gap-1 overflow-x-auto scrollbar-none pb-1">
              {INTENTS.map((it, i) => (
                <button
                  key={it.key}
                  onClick={() => setIntentIdx(i)}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-semibold border transition-all duration-200 shrink-0 whitespace-nowrap"
                  style={{
                    background: i === intentIdx ? "hsl(var(--accent) / 0.12)" : "transparent",
                    borderColor: i === intentIdx ? "hsl(var(--accent) / 0.3)" : "hsl(220 15% 90% / 0.06)",
                    color: i === intentIdx ? "hsl(var(--accent))" : "hsl(220 15% 50%)",
                  }}
                >
                  {it.key === "consumer" ? "🛒 Consumer" : it.key === "business" ? "🏪 Business" : it.key === "property" ? "🏠 Property" : "🔧 Services"}
                </button>
              ))}
            </motion.div>
          </div>

          {/* RIGHT — Floating cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="lg:col-span-5 hidden md:block"
          >
            <div className="relative w-full max-w-md mx-auto lg:max-w-none">
              <div className="grid grid-cols-2 gap-2.5">
                {FLOATING_CARDS.map((card, i) => (
                  <motion.div
                    key={card.title}
                    className="rounded-2xl border backdrop-blur-xl p-3.5 cursor-default relative"
                    style={{
                      background: "linear-gradient(145deg, hsl(222 42% 13% / 0.9), hsl(222 42% 9% / 0.95))",
                      borderColor: "hsl(220 20% 90% / 0.06)",
                      boxShadow: `0 4px 20px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(220 20% 90% / 0.04)`,
                    }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                    whileHover={{ scale: 1.03, y: -2 }}
                  >
                    {card.badge && (
                      <span className="absolute -top-1.5 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{
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
                        <p className="text-xs font-bold truncate" style={{ color: "hsl(40 50% 94%)" }}>{card.title}</p>
                        <p className="text-[10px] truncate" style={{ color: "hsl(220 15% 50%)" }}>{card.sub}</p>
                      </div>
                    </div>
                    <div className="mt-2 h-0.5 rounded-full" style={{ background: `${card.accent}40`, width: `${60 + i * 8}%` }} />
                  </motion.div>
                ))}
              </div>

              {/* Radar glow */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full -z-10"
                style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.12), transparent 70%)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Transaction pulse */}
              <motion.div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full border"
                style={{ background: "hsl(222 42% 10% / 0.95)", borderColor: "hsl(var(--success) / 0.2)" }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: "hsl(var(--success))" }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: "hsl(var(--success))" }} />
                  {liveStats.txPerMin} transactions in the last minute
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background via-background/50 to-transparent" />
    </section>
  );
};

export default Hero;
