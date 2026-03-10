import { motion } from "framer-motion";
import { ArrowRight, Globe, Rocket, MapPin, Shield, Zap, Building2, Star, Users, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import type { Transition } from "framer-motion";

const floatAnim = (delay: number): { y: number[]; transition: Transition } => ({
  y: [0, -6, 0],
  transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const, delay },
});

/** SEO city showcase — programmatic internal links */
const TOP_DESTINATIONS = [
  { name: "Dubai", slug: "dubai", flag: "🇦🇪" },
  { name: "Paris", slug: "paris", flag: "🇫🇷" },
  { name: "Barcelona", slug: "barcelona", flag: "🇪🇸" },
  { name: "Marrakech", slug: "marrakech", flag: "🇲🇦" },
  { name: "Bali", slug: "bali", flag: "🇮🇩" },
  { name: "Lisbon", slug: "lisbon", flag: "🇵🇹" },
  { name: "Bangkok", slug: "bangkok", flag: "🇹🇭" },
  { name: "London", slug: "london", flag: "🇬🇧" },
  { name: "Tokyo", slug: "tokyo", flag: "🇯🇵" },
  { name: "Istanbul", slug: "istanbul", flag: "🇹🇷" },
];

const Hero = () => {
  const { t } = useI18n();

  return (
    <section
      className="relative min-h-[92vh] sm:min-h-[96vh] flex items-center overflow-hidden pt-16"
      style={{ background: "linear-gradient(145deg, hsl(222 50% 6%) 0%, hsl(220 45% 12%) 35%, hsl(222 42% 16%) 65%, hsl(220 38% 10%) 100%)" }}
    >
      {/* ─── Background FX ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary accent glow */}
        <div
          className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.12) 0%, transparent 55%)" }}
        />
        {/* Secondary deep glow */}
        <div
          className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(210 60% 40% / 0.08) 0%, transparent 60%)" }}
        />
        {/* Animated orbs */}
        <motion.div
          className="absolute top-[8%] right-[12%] w-72 h-72 rounded-full blur-[140px]"
          style={{ background: "hsl(var(--accent) / 0.1)" }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.06, 0.14, 0.06] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[20%] left-[5%] w-56 h-56 rounded-full blur-[120px]"
          style={{ background: "hsl(152 60% 42% / 0.08)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.04, 0.1, 0.04] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--accent) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.4) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: `hsl(var(--accent) / ${0.3 + i * 0.05})`,
              top: `${10 + i * 10}%`,
              left: `${5 + i * 12}%`,
            }}
            animate={{ y: [0, -20, 0], opacity: [0.1, 0.45, 0.1] }}
            transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          />
        ))}
      </div>

      <div className="container relative z-10 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto text-center space-y-8 sm:space-y-10">

          {/* ─── Badge ─── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex justify-center"
          >
            <motion.span
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-semibold border backdrop-blur-md"
              style={{
                background: "hsl(var(--accent) / 0.1)",
                borderColor: "hsl(var(--accent) / 0.25)",
                color: "hsl(var(--gold-light))",
              }}
              whileHover={{ scale: 1.04 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(var(--success))" }} />
              </span>
              {t("landing.hero.badge") || "Run Your Business From Anywhere — 110+ Countries"}
            </motion.span>
          </motion.div>

          {/* ─── Headline ─── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="space-y-5"
          >
            <h1
              className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.12]"
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
              className="text-sm sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed"
              style={{ color: "hsl(220 15% 75%)" }}
            >
              {t("landing.hero.subtitle") || "One platform to manage rental properties, accept direct bookings, and run service businesses across multiple cities — all remotely."}
            </p>
          </motion.div>

          {/* ─── CTAs ─── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center gap-2.5 h-12 sm:h-14 px-8 sm:px-10 rounded-2xl text-sm font-bold transition-all relative overflow-hidden"
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
                className="group inline-flex items-center justify-center gap-2.5 h-12 sm:h-14 px-7 sm:px-8 rounded-2xl text-sm font-semibold transition-all border backdrop-blur-md"
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

          {/* ─── Trust stats ─── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="pt-6"
          >
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2.5 sm:gap-4">
              {[
                { icon: Globe, value: "110+", label: t("landing.hero.stat_countries") || "Countries" },
                { icon: Shield, value: t("landing.hero.stat_remote_val") || "Secure", label: t("landing.hero.stat_remote") || "Management" },
                { icon: Rocket, value: t("landing.hero.stat_multi_val") || "Multi-City", label: t("landing.hero.stat_multi") || "Operations" },
                { icon: MapPin, value: "24/7", label: "Remote" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl backdrop-blur-sm"
                  style={{
                    background: "hsl(220 20% 90% / 0.06)",
                    border: "1px solid hsl(220 20% 90% / 0.08)",
                  }}
                  animate={floatAnim(i * 0.6)}
                >
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "hsl(var(--accent) / 0.15)" }}
                  >
                    <s.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: "hsl(var(--accent))" }} />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-[11px] sm:text-xs font-extrabold leading-none truncate" style={{ color: "hsl(40 50% 95%)" }}>
                      {s.value}
                    </div>
                    <div className="text-[9px] font-medium mt-0.5 leading-none truncate" style={{ color: "hsl(220 15% 60%)" }}>
                      {s.label}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ─── SEO: Top Destinations — Programmatic Internal Links ─── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="pt-4"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: "hsl(220 15% 50%)" }}>
              {t("landing.hero.top_destinations") || "Top Destinations"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {TOP_DESTINATIONS.map((dest, i) => (
                <motion.div
                  key={dest.slug}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.1 + i * 0.06, duration: 0.3 }}
                >
                  <Link
                    to={`/city/${dest.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                    style={{
                      background: "hsl(220 20% 90% / 0.07)",
                      border: "1px solid hsl(220 20% 90% / 0.1)",
                      color: "hsl(220 15% 75%)",
                    }}
                  >
                    <span>{dest.flag}</span>
                    <span>{dest.name}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ─── SEO: Value Propositions Row ─── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="pt-2"
          >
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-6 text-[11px] font-medium" style={{ color: "hsl(220 15% 55%)" }}>
              {[
                { icon: Building2, text: t("landing.hero.vp_properties") || "Property Management" },
                { icon: Star, text: t("landing.hero.vp_bookings") || "Direct Bookings" },
                { icon: Users, text: t("landing.hero.vp_marketplace") || "Service Marketplace" },
                { icon: TrendingUp, text: t("landing.hero.vp_analytics") || "Revenue Analytics" },
              ].map((vp) => (
                <span key={vp.text} className="inline-flex items-center gap-1.5 justify-center">
                  <vp.icon className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--accent) / 0.6)" }} />
                  <span className="truncate">{vp.text}</span>
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
