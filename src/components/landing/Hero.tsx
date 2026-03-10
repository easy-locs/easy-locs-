import { motion } from "framer-motion";
import { ArrowRight, Globe, Rocket, MapPin, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import AppLogo from "@/components/AppLogo";
import type { Transition } from "framer-motion";

const floatAnim = (delay: number): { y: number[]; transition: Transition } => ({
  y: [0, -6, 0],
  transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const, delay },
});

const Hero = () => {
  const { t } = useI18n();

  return (
    <section
      className="relative min-h-[94vh] flex items-center overflow-hidden"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* ─── Background FX ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Central glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.15) 0%, transparent 60%)" }}
        />
        {/* Accent orbs */}
        <motion.div
          className="absolute top-[12%] right-[8%] w-80 h-80 rounded-full blur-[160px]"
          style={{ background: "hsl(200 70% 50% / 0.12)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.16, 0.08] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[15%] left-[3%] w-64 h-64 rounded-full blur-[130px]"
          style={{ background: "hsl(140 60% 45% / 0.1)" }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.06, 0.14, 0.06] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--accent) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.3) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: "hsl(var(--accent) / 0.5)",
              top: `${15 + i * 13}%`,
              left: `${8 + i * 16}%`,
            }}
            animate={{ y: [0, -25, 0], opacity: [0.15, 0.5, 0.15] }}
            transition={{ duration: 3.5 + i * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
          />
        ))}
      </div>

      <div className="container relative z-10 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto text-center space-y-7 sm:space-y-9">

          {/* ─── Logo ─── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 180, damping: 18 }}
            className="flex justify-center"
          >
            <AppLogo variant="landing" linkTo="/" />
          </motion.div>

          {/* ─── Badge ─── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex justify-center"
          >
            <motion.span
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-semibold border backdrop-blur-md"
              style={{
                background: "hsl(var(--accent) / 0.08)",
                borderColor: "hsl(var(--accent) / 0.2)",
                color: "hsl(var(--gold-light))",
              }}
              whileHover={{ scale: 1.04 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {t("landing.hero.badge") || "Run Your Business From Anywhere — 110+ Countries"}
            </motion.span>
          </motion.div>

          {/* ─── Headline ─── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="space-y-5"
          >
            <h1
              className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.08]"
              style={{ color: "hsl(var(--primary-foreground))" }}
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
              className="text-sm sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed"
              style={{ color: "hsl(var(--primary-foreground) / 0.65)" }}
            >
              {t("landing.hero.subtitle") || "One platform to manage rental properties, accept direct bookings, and run service businesses across multiple cities — all remotely."}
            </p>
          </motion.div>

          {/* ─── CTAs ─── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center gap-2.5 h-12 sm:h-14 px-8 sm:px-10 rounded-2xl text-sm font-bold transition-all relative overflow-hidden"
                style={{
                  background: "var(--gradient-gold)",
                  color: "hsl(var(--accent-foreground))",
                  boxShadow: "0 0 40px hsl(var(--accent) / 0.25), 0 4px 20px hsl(0 0% 0% / 0.2)",
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
                className="group inline-flex items-center justify-center gap-2.5 h-12 sm:h-14 px-7 sm:px-8 rounded-2xl text-sm font-semibold transition-all border backdrop-blur-md"
                style={{
                  borderColor: "hsl(var(--primary-foreground) / 0.12)",
                  color: "hsl(var(--primary-foreground))",
                  background: "hsl(var(--primary-foreground) / 0.05)",
                }}
              >
                <Globe className="h-4 w-4 opacity-70" />
                {t("landing.hero.cta_explore") || "Explore Listings"}
              </Link>
            </motion.div>
          </motion.div>

          {/* ─── Trust stats ─── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.7 }}
            className="pt-8"
          >
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {[
                { icon: Globe, value: "110+", label: t("landing.hero.stat_countries") || "Countries" },
                { icon: Shield, value: t("landing.hero.stat_remote_val") || "Secure", label: t("landing.hero.stat_remote") || "Management" },
                { icon: Rocket, value: t("landing.hero.stat_multi_val") || "Multi-City", label: t("landing.hero.stat_multi") || "Operations" },
                { icon: MapPin, value: "24/7", label: "Remote" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl backdrop-blur-sm"
                  style={{
                    background: "hsl(var(--primary-foreground) / 0.04)",
                    border: "1px solid hsl(var(--primary-foreground) / 0.06)",
                  }}
                  animate={floatAnim(i * 0.6)}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "hsl(var(--accent) / 0.12)" }}
                  >
                    <s.icon className="h-3.5 w-3.5" style={{ color: "hsl(var(--accent))" }} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-extrabold leading-none" style={{ color: "hsl(var(--primary-foreground))" }}>
                      {s.value}
                    </div>
                    <div className="text-[9px] font-medium mt-0.5 leading-none" style={{ color: "hsl(var(--primary-foreground) / 0.45)" }}>
                      {s.label}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
