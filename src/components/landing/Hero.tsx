import { motion } from "framer-motion";
import { ArrowRight, Zap, UtensilsCrossed, ShoppingCart, Wrench, Car, Send, Plane, Building2, Wallet, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";

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
  { title: "Order Food", sub: "25 min · 1.2km", emoji: "🍛", x: 0, y: 0, w: "55%", rotate: -2 },
  { title: "Book a Stay", sub: "Paris · 3 nights", emoji: "🏨", x: "52%", y: "8%", w: "52%", rotate: 1.5 },
  { title: "Rent Property", sub: "Dakar · 450€/mo", emoji: "🏠", x: "5%", y: "48%", w: "50%", rotate: 1 },
  { title: "Send Package", sub: "Express · 2h", emoji: "📦", x: "48%", y: "55%", w: "48%", rotate: -1.5 },
];

const Hero = () => {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  return (
    <section
      aria-label="Hero"
      className="relative overflow-hidden pt-16 sm:pt-20"
      style={{ background: "linear-gradient(160deg, hsl(222 50% 5%) 0%, hsl(220 48% 9%) 40%, hsl(222 42% 14%) 70%, hsl(220 38% 8%) 100%)" }}
    >
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[10%] left-[20%] w-[500px] h-[500px] lg:w-[800px] lg:h-[800px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.1) 0%, transparent 60%)" }}
        />
        <div
          className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] lg:w-[600px] lg:h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(var(--info) / 0.06) 0%, transparent 60%)" }}
        />
        {/* Grid overlay — desktop */}
        <div
          className="hidden lg:block absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--accent) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.5) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24 xl:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 xl:gap-20 items-center">

          {/* ══════ LEFT — Copy ══════ */}
          <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex justify-center lg:justify-start"
            >
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold border backdrop-blur-xl"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--accent) / 0.1), hsl(var(--accent) / 0.03))",
                  borderColor: "hsl(var(--accent) / 0.2)",
                  color: "hsl(var(--gold-light))",
                }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(var(--success))" }} />
                </span>
                Live in 190+ countries
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.5rem] font-extrabold tracking-tight leading-[1.1]"
              style={{ color: "hsl(40 50% 97%)" }}
            >
              One app.{" "}
              <motion.span
                className="text-gradient-gold"
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: "200% 200%" }}
              >
                Every service.
              </motion.span>
              <br />
              <span style={{ color: "hsl(220 15% 70%)" }} className="text-2xl sm:text-3xl lg:text-4xl xl:text-[2.8rem] font-bold">
                Anywhere in the world.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="text-sm sm:text-base lg:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed"
              style={{ color: "hsl(220 15% 60%)" }}
            >
              Order food, book rides, send packages, find services, travel, rent property — and manage payments. All from one premium platform.
            </motion.p>

            {/* Universe chips */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="flex flex-wrap justify-center lg:justify-start gap-2"
            >
              {UNIVERSES.map((u, i) => (
                <motion.span
                  key={u.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.04 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border"
                  style={{
                    background: u.bg,
                    borderColor: `${u.color}30`,
                    color: u.color,
                  }}
                >
                  <u.icon className="h-3 w-3" />
                  {u.label}
                </motion.span>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3"
            >
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/signup"
                  className="group inline-flex items-center justify-center gap-2 h-12 sm:h-13 px-8 sm:px-10 rounded-2xl text-sm font-bold transition-all relative overflow-hidden w-full sm:w-auto"
                  style={{
                    background: "var(--gradient-gold)",
                    color: "hsl(var(--accent-foreground))",
                    boxShadow: "0 0 40px hsl(var(--accent) / 0.3), 0 4px 20px hsl(0 0% 0% / 0.25)",
                  }}
                >
                  <Zap className="h-4 w-4" />
                  Get Started Free
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/explore"
                  className="inline-flex items-center justify-center gap-2 h-12 sm:h-13 px-7 sm:px-8 rounded-2xl text-sm font-semibold transition-all border w-full sm:w-auto"
                  style={{
                    borderColor: "hsl(220 15% 75% / 0.12)",
                    color: "hsl(220 15% 80%)",
                    background: "hsl(220 15% 80% / 0.04)",
                  }}
                >
                  List Your Business
                </Link>
              </motion.div>
            </motion.div>

            {/* Trust line */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center lg:justify-start gap-6 pt-2"
            >
              {[
                { val: "190+", lbl: "Countries" },
                { val: "0%", lbl: "Commission" },
                { val: "120+", lbl: "Currencies" },
              ].map((s) => (
                <div key={s.lbl} className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold" style={{ color: "hsl(var(--accent))" }}>{s.val}</span>
                  <span className="text-[10px] font-medium" style={{ color: "hsl(220 15% 50%)" }}>{s.lbl}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ══════ RIGHT — Visual Composition ══════ */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden sm:block"
          >
            <div className="relative w-full aspect-square max-w-lg mx-auto lg:max-w-none">
              {/* Glow backdrop */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: "radial-gradient(circle at 40% 40%, hsl(var(--accent) / 0.08), transparent 60%)",
                }}
              />

              {/* Floating universe cards */}
              {VISUAL_CARDS.map((card, i) => (
                <motion.div
                  key={card.title}
                  className="absolute rounded-2xl border backdrop-blur-xl p-4 sm:p-5"
                  style={{
                    left: card.x,
                    top: card.y,
                    width: card.w,
                    background: "linear-gradient(145deg, hsl(222 42% 14% / 0.85), hsl(222 42% 10% / 0.9))",
                    borderColor: "hsl(220 20% 90% / 0.08)",
                    boxShadow: "0 8px 32px hsl(0 0% 0% / 0.3), 0 0 0 1px hsl(220 20% 90% / 0.04)",
                    rotate: `${card.rotate}deg`,
                  }}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ scale: 1.04, rotate: 0, zIndex: 10 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{card.emoji}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "hsl(40 50% 95%)" }}>{card.title}</p>
                      <p className="text-[11px]" style={{ color: "hsl(220 15% 55%)" }}>{card.sub}</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Center highlight circle */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full"
                style={{
                  background: "radial-gradient(circle, hsl(var(--accent) / 0.15), transparent 70%)",
                  boxShadow: "0 0 60px hsl(var(--accent) / 0.1)",
                }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/50 to-transparent" />
    </section>
  );
};

export default Hero;
