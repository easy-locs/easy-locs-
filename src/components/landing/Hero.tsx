import { motion } from "framer-motion";
import { ArrowRight, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import AppLogo from "@/components/AppLogo";

const Hero = () => {
  const { t } = useI18n();

  return (
    <section
      className="relative min-h-[90vh] flex items-center overflow-hidden"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.25) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--accent) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.3) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <div className="container relative z-10 py-24 sm:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center"
          >
            <AppLogo variant="landing" showLabel linkTo="/" />
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-4"
          >
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.1]"
              style={{ color: "hsl(var(--primary-foreground))" }}
            >
              {t("landing.hero.title") || "The Global Platform for"}{" "}
              <span className="text-gradient-gold">
                {t("landing.hero.tw_tenants") || "Property Management"}
              </span>
            </h1>
            <p
              className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
              style={{ color: "hsl(var(--primary-foreground) / 0.55)" }}
            >
              {t("landing.hero.subtitle") || "All-in-one platform for landlords, tenants and concierge professionals. Leases, payments, bookings — 110+ countries."}
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/login"
              className="group inline-flex items-center justify-center gap-2.5 h-12 px-8 rounded-xl text-sm font-semibold transition-all border"
              style={{
                borderColor: "hsl(var(--primary-foreground) / 0.15)",
                color: "hsl(var(--primary-foreground))",
                background: "hsl(var(--primary-foreground) / 0.06)",
              }}
            >
              <LogIn className="h-4 w-4" />
              {t("landing.nav.login") || "Login"}
            </Link>
            <Link
              to="/signup"
              className="group inline-flex items-center justify-center gap-2.5 h-12 px-8 rounded-xl text-sm font-bold transition-all relative overflow-hidden"
              style={{
                background: "var(--gradient-gold)",
                color: "hsl(var(--accent-foreground))",
                boxShadow: "0 0 24px hsl(var(--accent) / 0.25)",
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                {t("landing.nav.pro_signup") || "Create Account"}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>
          </motion.div>

          {/* Trust bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex items-center justify-center gap-8 sm:gap-12 pt-4"
          >
            {[
              { value: "110+", label: t("landing.hero.trust_countries") || "Countries" },
              { value: "GDPR", label: t("landing.hero.trust_gdpr") || "Compliant" },
              { value: "AI", label: t("landing.hero.trust_ai") || "Powered" },
            ].map((s) => (
              <div key={s.value} className="text-center">
                <div className="text-xl sm:text-2xl font-extrabold" style={{ color: "hsl(var(--accent))" }}>
                  {s.value}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "hsl(var(--primary-foreground) / 0.4)" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
