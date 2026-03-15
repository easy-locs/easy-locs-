import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Globe, Zap, Building2, CreditCard, Shield, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Transition } from "framer-motion";

const floatAnim = (delay: number): { y: number[]; transition: Transition } => ({
  y: [0, -6, 0],
  transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const, delay },
});

const HERO_STATS = [
  { value: "190+", label: "Countries", icon: Globe },
  { value: "0%", label: "Commission", icon: Shield },
  { value: "120+", label: "Currencies", icon: CreditCard },
  { value: "24/7", label: "Remote", icon: Building2 },
];

const FLOATING_FEATURES = [
  { label: "Smart Leases", x: "8%", y: "18%", delay: 0 },
  { label: "Direct Bookings", x: "78%", y: "22%", delay: 1.5 },
  { label: "AI Documents", x: "5%", y: "72%", delay: 3 },
  { label: "Global Pay", x: "82%", y: "68%", delay: 2.2 },
];

const Hero = () => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", isMobile ? "10%" : "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={ref}
      aria-label="Hero"
      className="relative min-h-[85vh] sm:min-h-[95vh] flex items-center overflow-hidden pt-14 sm:pt-16"
      style={{ background: "linear-gradient(145deg, hsl(222 50% 5%) 0%, hsl(220 48% 10%) 30%, hsl(222 42% 15%) 60%, hsl(220 38% 8%) 100%)" }}
    >
      {/* Parallax background FX — reduced on mobile for Safari perf */}
      <motion.div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ y: isMobile ? undefined : bgY }}>
        {/* Primary radial glow */}
        <div
          className="absolute top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[1000px] h-[600px] sm:h-[1000px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.14) 0%, transparent 50%)" }}
        />
        {/* Secondary orb — static on mobile, animated on desktop */}
        {!isMobile && (
          <motion.div
            className="absolute top-[10%] right-[8%] w-96 h-96 rounded-full blur-[120px]"
            style={{ background: "hsl(var(--accent) / 0.08)" }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.04, 0.12, 0.04] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        {/* Third orb — desktop only */}
        {!isMobile && (
          <motion.div
            className="absolute bottom-[20%] left-[5%] w-72 h-72 rounded-full blur-[100px]"
            style={{ background: "hsl(var(--info) / 0.06)" }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.03, 0.08, 0.03] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          />
        )}
        {/* Grid overlay — desktop only */}
        {!isMobile && (
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `linear-gradient(hsl(var(--accent) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.5) 1px, transparent 1px)`,
              backgroundSize: "80px 80px",
            }}
          />
        )}
      </motion.div>

      {/* Floating feature pills — hidden on mobile */}
      <div className="hidden lg:block">
        {FLOATING_FEATURES.map((feat, i) => (
          <motion.div
            key={feat.label}
            className="absolute z-20 px-3.5 py-1.5 rounded-full text-[10px] font-semibold backdrop-blur-xl border"
            style={{
              left: feat.x,
              top: feat.y,
              background: "hsl(220 40% 12% / 0.7)",
              borderColor: "hsl(var(--accent) / 0.2)",
              color: "hsl(var(--gold-light))",
              boxShadow: "0 0 20px hsl(var(--accent) / 0.1)",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 1, 0.7, 1], scale: 1 }}
            transition={{ delay: 1 + feat.delay * 0.3, duration: 1.5 }}
          >
            <motion.div animate={floatAnim(feat.delay)} className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-accent" />
              {feat.label}
            </motion.div>
          </motion.div>
        ))}
      </div>

      <motion.div className="container relative z-10 py-10 sm:py-28 px-4" style={{ opacity }}>
        <div className="max-w-4xl mx-auto text-center space-y-7 sm:space-y-10">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex justify-center"
          >
            <span
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-[11px] sm:text-xs font-semibold border backdrop-blur-xl"
              style={{
                background: "linear-gradient(135deg, hsl(var(--accent) / 0.12), hsl(var(--accent) / 0.04))",
                borderColor: "hsl(var(--accent) / 0.25)",
                color: "hsl(var(--gold-light))",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(var(--success))" }} />
              </span>
              {t("landing.hero.badge") || "Run Your Business From Anywhere — 190+ Countries"}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div className="space-y-5">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="text-[1.75rem] leading-[1.15] sm:text-5xl lg:text-[3.6rem] font-extrabold tracking-tight sm:leading-[1.1]"
              style={{ color: "hsl(40 50% 97%)", textWrap: "balance" }}
            >
              {t("landing.hero.title_1") || "Build Your Property &"}
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              {t("landing.hero.title_2") || "Service Business"}{" "}
              <span className="relative inline-block">
                <motion.span
                  className="text-gradient-gold"
                  style={{
                    backgroundSize: "200% 200%",
                  }}
                  animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                >
                  {t("landing.hero.title_highlight") || "Globally."}
                </motion.span>
                <motion.span
                  className="absolute -bottom-1.5 left-0 right-0 h-1 rounded-full"
                  style={{ background: "var(--gradient-gold)" }}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="text-[13px] sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed"
              style={{ color: "hsl(220 15% 72%)" }}
            >
              {t("landing.hero.subtitle") || "One platform to manage rental properties, accept direct bookings, and run service businesses across multiple cities — all remotely."}
            </motion.p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0"
          >
            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400 }}>
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center gap-2.5 h-13 sm:h-14 px-9 sm:px-11 rounded-2xl text-sm font-bold transition-all relative overflow-hidden w-full sm:w-auto"
                style={{
                  background: "var(--gradient-gold)",
                  color: "hsl(var(--accent-foreground))",
                  boxShadow: "0 0 50px hsl(var(--accent) / 0.35), 0 6px 24px hsl(0 0% 0% / 0.3)",
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  {t("landing.hero.cta_start") || "Start Free"}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400 }}>
              <Link
                to="/explore"
                className="group inline-flex items-center justify-center gap-2.5 h-13 sm:h-14 px-8 sm:px-9 rounded-2xl text-sm font-semibold transition-all border backdrop-blur-xl w-full sm:w-auto"
                style={{
                  borderColor: "hsl(220 15% 75% / 0.12)",
                  color: "hsl(220 15% 85%)",
                  background: "hsl(220 15% 85% / 0.05)",
                }}
              >
                <Globe className="h-4 w-4 opacity-70 group-hover:rotate-12 transition-transform duration-300" />
                {t("landing.hero.cta_explore") || "Explore Listings"}
              </Link>
            </motion.div>
          </motion.div>

          {/* Trust stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.7 }}
            className="pt-6"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-xl sm:max-w-2xl mx-auto">
              {HERO_STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl min-h-[44px]"
                  style={{
                    background: "linear-gradient(135deg, hsl(220 20% 90% / 0.06), hsl(220 20% 90% / 0.02))",
                    border: "1px solid hsl(220 20% 90% / 0.08)",
                  }}
                  {...(!isMobile ? { animate: floatAnim(i * 0.6) } : {})}
                >
                  <s.icon className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--accent) / 0.7)" }} />
                  <span className="text-xs sm:text-sm font-extrabold whitespace-nowrap" style={{ color: "hsl(var(--accent))" }}>
                    {s.value}
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap" style={{ color: "hsl(220 15% 55%)" }}>
                    {s.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom gradient fade — smoother */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/50 to-transparent" />

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full border-2 flex justify-center pt-2"
          style={{ borderColor: "hsl(220 15% 90% / 0.15)" }}
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="w-1 h-2.5 rounded-full"
            style={{ background: "hsl(var(--accent) / 0.6)" }}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, 4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
