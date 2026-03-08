import { motion } from "framer-motion";
import { ArrowRight, LogIn, Globe, Shield, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import AppLogo from "@/components/AppLogo";

const Hero = () => {
  const { t } = useI18n();

  return (
    <section
      className="relative min-h-[92vh] flex items-center overflow-hidden"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-12"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.2) 0%, transparent 65%)" }}
        />
        <motion.div
          className="absolute top-[15%] right-[10%] w-72 h-72 rounded-full blur-[140px] opacity-10"
          style={{ background: "hsl(var(--info))" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[20%] left-[5%] w-56 h-56 rounded-full blur-[120px] opacity-8"
          style={{ background: "hsl(var(--success))" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--accent) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.3) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <div className="container relative z-10 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center"
          >
            <AppLogo variant="landing" showLabel linkTo="/" />
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex justify-center"
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold border"
              style={{
                background: "hsl(var(--accent) / 0.08)",
                borderColor: "hsl(var(--accent) / 0.2)",
                color: "hsl(var(--gold-light))",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              {t("landing.hero.badge") || "AI-Powered Property Management — 110+ Countries"}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="space-y-5"
          >
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.06]"
              style={{ color: "hsl(var(--primary-foreground))" }}
            >
              {t("landing.hero.title") || "Manage Properties,"}
              <br />
              <span className="text-gradient-gold">
                {t("landing.hero.tw_tenants") || "Worldwide."}
              </span>
            </h1>
            <p
              className="text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed"
              style={{ color: "hsl(var(--primary-foreground) / 0.5)" }}
            >
              {t("landing.hero.subtitle") || "All-in-one platform for landlords, tenants and concierge professionals. Leases, payments, bookings — 110+ countries."}
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/login"
              className="group inline-flex items-center justify-center gap-2.5 h-13 sm:h-14 px-8 rounded-2xl text-sm font-semibold transition-all border"
              style={{
                borderColor: "hsl(var(--primary-foreground) / 0.12)",
                color: "hsl(var(--primary-foreground))",
                background: "hsl(var(--primary-foreground) / 0.05)",
              }}
            >
              <LogIn className="h-4 w-4" />
              {t("landing.nav.login") || "Login"}
            </Link>
            <Link
              to="/signup"
              className="group inline-flex items-center justify-center gap-2.5 h-13 sm:h-14 px-10 rounded-2xl text-sm font-bold transition-all relative overflow-hidden"
              style={{
                background: "var(--gradient-gold)",
                color: "hsl(var(--accent-foreground))",
                boxShadow: "0 0 30px hsl(var(--accent) / 0.3)",
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                {t("landing.nav.pro_signup") || "Create Account"}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex items-center justify-center gap-6 sm:gap-10 pt-6"
          >
            {[
              { icon: Globe, value: "110+", label: t("landing.hero.trust_countries") || "Countries" },
              { icon: Shield, value: "GDPR", label: t("landing.hero.trust_gdpr") || "Compliant" },
              { icon: Sparkles, value: "AI", label: t("landing.hero.trust_ai") || "Powered" },
            ].map((s) => (
              <div key={s.value} className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: "hsl(var(--accent) / 0.08)" }}
                >
                  <s.icon className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
                </div>
                <div>
                  <div className="text-sm font-extrabold" style={{ color: "hsl(var(--primary-foreground))" }}>
                    {s.value}
                  </div>
                  <div className="text-[10px]" style={{ color: "hsl(var(--primary-foreground) / 0.35)" }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
