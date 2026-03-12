import { motion } from "framer-motion";
import { ArrowRight, Globe, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import type { Transition } from "framer-motion";

const floatAnim = (delay: number): { y: number[]; transition: Transition } => ({
  y: [0, -5, 0],
  transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const, delay },
});

const HERO_STATS = [
  { value: "190+", label: "Countries" },
  { value: "0%", label: "Commission" },
  { value: "Multi-City", label: "Operations" },
  { value: "24/7", label: "Remote" },
];

const Hero = () => {
  const { t } = useI18n();

  return (
    <section
      aria-label="Hero"
      className="relative min-h-[80vh] sm:min-h-[92vh] flex items-center overflow-hidden pt-14 sm:pt-16"
      style={{ background: "linear-gradient(145deg, hsl(222 50% 6%) 0%, hsl(220 45% 12%) 35%, hsl(222 42% 16%) 65%, hsl(220 38% 10%) 100%)" }}
    >
      {/* Background FX */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.12) 0%, transparent 55%)" }}
        />
        <motion.div
          className="absolute top-[8%] right-[12%] w-72 h-72 rounded-full blur-[140px]"
          style={{ background: "hsl(var(--accent) / 0.1)" }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.06, 0.14, 0.06] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--accent) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.4) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container relative z-10 py-10 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex justify-center"
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] sm:text-xs font-semibold border backdrop-blur-md"
              style={{
                background: "hsl(var(--accent) / 0.1)",
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
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="space-y-4"
          >
            <h1
              className="text-[1.6rem] leading-[1.2] sm:text-5xl lg:text-6xl font-extrabold tracking-tight sm:leading-[1.12]"
              style={{ color: "hsl(40 50% 97%)", textWrap: "balance" }}
            >
              {t("landing.hero.title_1") || "Build Your Property &"}
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              {t("landing.hero.title_2") || "Service Business"}{" "}
              <span className="relative inline-block">
                <motion.span
                  className="text-gradient-gold"
                  animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                >
                  {t("landing.hero.title_highlight") || "Globally."}
                </motion.span>
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 h-1 rounded-full"
                  style={{ background: "var(--gradient-gold)" }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1.2, duration: 0.6, ease: "easeOut" }}
                />
              </span>
            </h1>
            <p
              className="text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed"
              style={{ color: "hsl(220 15% 75%)" }}
            >
              {t("landing.hero.subtitle") || "One platform to manage rental properties, accept direct bookings, and run service businesses across multiple cities — all remotely."}
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center gap-2.5 h-12 sm:h-14 px-8 sm:px-10 rounded-2xl text-sm font-bold transition-all relative overflow-hidden w-full sm:w-auto"
                style={{
                  background: "var(--gradient-gold)",
                  color: "hsl(var(--accent-foreground))",
                  boxShadow: "0 0 40px hsl(var(--accent) / 0.3), 0 4px 20px hsl(0 0% 0% / 0.25)",
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  {t("landing.hero.cta_start") || "Start Free"}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/explore"
                className="group inline-flex items-center justify-center gap-2.5 h-12 sm:h-14 px-7 sm:px-8 rounded-2xl text-sm font-semibold transition-all border backdrop-blur-md w-full sm:w-auto"
                style={{
                  borderColor: "hsl(220 15% 75% / 0.15)",
                  color: "hsl(220 15% 85%)",
                  background: "hsl(220 15% 85% / 0.06)",
                }}
              >
                <Globe className="h-4 w-4 opacity-70" />
                {t("landing.hero.cta_explore") || "Explore Listings"}
              </Link>
            </motion.div>
          </motion.div>

          {/* Trust stats — compact row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="pt-4"
          >
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
              {HERO_STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{
                    background: "hsl(220 20% 90% / 0.05)",
                    border: "1px solid hsl(220 20% 90% / 0.08)",
                  }}
                  animate={floatAnim(i * 0.5)}
                >
                  <span className="text-xs sm:text-sm font-extrabold" style={{ color: "hsl(var(--accent))" }}>
                    {s.value}
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium" style={{ color: "hsl(220 15% 60%)" }}>
                    {s.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
