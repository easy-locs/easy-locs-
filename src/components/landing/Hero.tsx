import { motion } from "framer-motion";
import { ArrowRight, Zap, UtensilsCrossed, ShoppingCart, Wrench, Car, Send, Plane, Building2, Wallet, MessageCircle, Globe, Shield, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Transition } from "framer-motion";

const UNIVERSES = [
  { icon: UtensilsCrossed, label: "Food", color: "hsl(15 80% 55%)", bg: "hsl(15 80% 55% / 0.12)" },
  { icon: ShoppingCart, label: "Grocery", color: "hsl(142 60% 45%)", bg: "hsl(142 60% 45% / 0.12)" },
  { icon: Wrench, label: "Services", color: "hsl(220 70% 55%)", bg: "hsl(220 70% 55% / 0.12)" },
  { icon: Car, label: "Ride", color: "hsl(270 60% 55%)", bg: "hsl(270 60% 55% / 0.12)" },
  { icon: Send, label: "Send", color: "hsl(190 70% 45%)", bg: "hsl(190 70% 45% / 0.12)" },
  { icon: Plane, label: "Travel", color: "hsl(250 65% 55%)", bg: "hsl(250 65% 55% / 0.12)" },
  { icon: Building2, label: "Property", color: "hsl(38 65% 50%)", bg: "hsl(38 65% 50% / 0.12)" },
  { icon: Wallet, label: "Wallet", color: "hsl(152 60% 42%)", bg: "hsl(152 60% 42% / 0.12)" },
  { icon: MessageCircle, label: "Messages", color: "hsl(210 80% 52%)", bg: "hsl(210 80% 52% / 0.12)" },
];

const VISUAL_CARDS = [
  { title: "Order Food", sub: "African · 25 min", emoji: "🍛", accent: "hsl(15 80% 55%)" },
  { title: "Book a Stay", sub: "Paris · 3 nights", emoji: "🏨", accent: "hsl(250 65% 55%)" },
  { title: "Get a Ride", sub: "Pickup in 4 min", emoji: "🚗", accent: "hsl(270 60% 55%)" },
  { title: "Send Money", sub: "Instant · 0 fees", emoji: "💸", accent: "hsl(152 60% 42%)" },
  { title: "Rent Property", sub: "Dakar · 450€/mo", emoji: "🏠", accent: "hsl(38 65% 50%)" },
  { title: "Find Services", sub: "Cleaning · 1.2km", emoji: "🧹", accent: "hsl(220 70% 55%)" },
];

const TRUST_STATS = [
  { icon: Globe, val: "190+", lbl: "Countries" },
  { icon: Shield, val: "0%", lbl: "Commission" },
  { icon: CreditCard, val: "120+", lbl: "Currencies" },
];

const floatAnim = (delay: number): { y: number[]; transition: Transition } => ({
  y: [0, -5, 0],
  transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const, delay },
});

const Hero = () => {
  const isMobile = useIsMobile();

  return (
    <section
      aria-label="Hero"
      className="relative overflow-hidden pt-16 sm:pt-20"
      style={{ background: "linear-gradient(160deg, hsl(222 50% 4%) 0%, hsl(220 48% 8%) 35%, hsl(222 42% 13%) 65%, hsl(220 38% 7%) 100%)" }}
    >
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] left-[15%] w-[500px] h-[500px] lg:w-[900px] lg:h-[900px] rounded-full" style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.08) 0%, transparent 55%)" }} />
        <div className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] lg:w-[700px] lg:h-[700px] rounded-full" style={{ background: "radial-gradient(circle, hsl(var(--info) / 0.05) 0%, transparent 55%)" }} />
        {!isMobile && (
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `linear-gradient(hsl(var(--accent) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.5) 1px, transparent 1px)`, backgroundSize: "80px 80px" }} />
        )}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 xl:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">

          {/* ══════ LEFT — 7 cols ══════ */}
          <div className="lg:col-span-7 space-y-5 lg:space-y-7 text-center lg:text-left">
            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="flex justify-center lg:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] sm:text-[11px] font-semibold border backdrop-blur-xl" style={{ background: "linear-gradient(135deg, hsl(var(--accent) / 0.1), hsl(var(--accent) / 0.03))", borderColor: "hsl(var(--accent) / 0.2)", color: "hsl(var(--gold-light))" }}>
                <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} /><span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "hsl(var(--success))" }} /></span>
                Live in 190+ countries
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="text-[1.7rem] sm:text-4xl lg:text-[2.8rem] xl:text-5xl font-extrabold tracking-tight leading-[1.08]" style={{ color: "hsl(40 50% 97%)" }}>
              One app.{" "}
              <motion.span className="text-gradient-gold" animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} style={{ backgroundSize: "200% 200%" }}>Every service.</motion.span>
              <br />
              <span style={{ color: "hsl(220 15% 65%)" }} className="text-xl sm:text-2xl lg:text-3xl xl:text-[2.2rem] font-bold">Anywhere in the world.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="text-xs sm:text-sm lg:text-base max-w-lg mx-auto lg:mx-0 leading-relaxed" style={{ color: "hsl(220 15% 55%)" }}>
              Order food, book rides, send packages, find services, travel, rent property and manage payments — all from one platform.
            </motion.p>

            {/* Universe chips */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-wrap justify-center lg:justify-start gap-1.5">
              {UNIVERSES.map((u, i) => (
                <motion.span key={u.label} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45 + i * 0.03 }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border" style={{ background: u.bg, borderColor: `${u.color}25`, color: u.color }}>
                  <u.icon className="h-2.5 w-2.5" />{u.label}
                </motion.span>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-2.5">
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/signup" className="group inline-flex items-center justify-center gap-2 h-11 sm:h-12 px-7 sm:px-9 rounded-2xl text-sm font-bold relative overflow-hidden w-full sm:w-auto" style={{ background: "var(--gradient-gold)", color: "hsl(var(--accent-foreground))", boxShadow: "0 0 35px hsl(var(--accent) / 0.25), 0 4px 16px hsl(0 0% 0% / 0.2)" }}>
                  <Zap className="h-3.5 w-3.5" />Get Started Free<ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/explore" className="inline-flex items-center justify-center gap-2 h-11 sm:h-12 px-6 sm:px-7 rounded-2xl text-sm font-semibold border w-full sm:w-auto" style={{ borderColor: "hsl(220 15% 75% / 0.1)", color: "hsl(220 15% 75%)", background: "hsl(220 15% 75% / 0.04)" }}>
                  List Your Business
                </Link>
              </motion.div>
            </motion.div>

            {/* Trust stats */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex items-center justify-center lg:justify-start gap-5 pt-1">
              {TRUST_STATS.map((s) => (
                <div key={s.lbl} className="flex items-center gap-1.5">
                  <s.icon className="h-3 w-3" style={{ color: "hsl(var(--accent) / 0.6)" }} />
                  <span className="text-xs font-extrabold" style={{ color: "hsl(var(--accent))" }}>{s.val}</span>
                  <span className="text-[10px] font-medium" style={{ color: "hsl(220 15% 45%)" }}>{s.lbl}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ══════ RIGHT — 5 cols — Visual composition ══════ */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="lg:col-span-5 hidden md:block"
          >
            <div className="relative w-full max-w-md mx-auto lg:max-w-none">
              {/* Card stack */}
              <div className="grid grid-cols-2 gap-2.5">
                {VISUAL_CARDS.map((card, i) => (
                  <motion.div
                    key={card.title}
                    className="rounded-2xl border backdrop-blur-xl p-3.5 cursor-default"
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

              {/* Center glow */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full -z-10"
                style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.1), transparent 70%)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
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
