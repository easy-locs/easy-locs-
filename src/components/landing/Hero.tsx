import { motion } from "framer-motion";
import { ArrowRight, LogIn, Globe, Rocket, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import AppLogo from "@/components/AppLogo";

const floatAnim = (delay: number) => ({
  y: [0, -8, 0],
  transition: { duration: 4, repeat: Infinity, ease: "easeInOut", delay },
});

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
        {/* Animated particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: "hsl(var(--accent) / 0.4)",
              top: `${20 + i * 15}%`,
              left: `${10 + i * 18}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
          />
        ))}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--accent) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.3) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <div className="container relative z-10 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto text-center space-y-8 sm:space-y-10">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, type: "spring", stiffness: 200 }}
            className="flex justify-center"
          >
            <AppLogo variant="landing" showLabel linkTo="/" />
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center"
          >
            <motion.span
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold border backdrop-blur-sm"
              style={{
                background: "hsl(var(--accent) / 0.1)",
                borderColor: "hsl(var(--accent) / 0.25)",
                color: "hsl(var(--gold-light))",
              }}
              whileHover={{ scale: 1.05, borderColor: "hsl(var(--accent) / 0.4)" }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Run Your Business From Anywhere — 110+ Countries
            </motion.span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="space-y-5"
          >
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.06]"
              style={{ color: "hsl(var(--primary-foreground))" }}
            >
              Build Your Property &
              <br />
              Service Business{" "}
              <motion.span
                className="text-gradient-gold inline-block"
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              >
                Globally.
              </motion.span>
            </h1>
            <p
              className="text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed"
              style={{ color: "hsl(var(--primary-foreground) / 0.7)" }}
            >
              One platform to manage rental properties, accept direct bookings, and run service businesses across multiple cities — all remotely.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center gap-2.5 h-13 sm:h-14 px-10 rounded-2xl text-sm font-bold transition-all relative overflow-hidden"
                style={{
                  background: "var(--gradient-gold)",
                  color: "hsl(var(--accent-foreground))",
                  boxShadow: "0 0 30px hsl(var(--accent) / 0.3), 0 0 60px hsl(var(--accent) / 0.1)",
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Free
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/login"
                className="group inline-flex items-center justify-center gap-2.5 h-13 sm:h-14 px-8 rounded-2xl text-sm font-semibold transition-all border backdrop-blur-sm"
                style={{
                  borderColor: "hsl(var(--primary-foreground) / 0.15)",
                  color: "hsl(var(--primary-foreground))",
                  background: "hsl(var(--primary-foreground) / 0.06)",
                }}
              >
                <LogIn className="h-4 w-4" />
                {t("landing.nav.login") || "Login"}
              </Link>
            </motion.div>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-5 sm:gap-10 pt-6"
          >
            {[
              { icon: Globe, value: "110+", label: "Countries" },
              { icon: Rocket, value: "Remote", label: "Management" },
              { icon: MapPin, value: "Multi-City", label: "Operations" },
            ].map((s, i) => (
              <motion.div
                key={s.value}
                className="flex items-center gap-3"
                animate={floatAnim(i * 0.8)}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
                  style={{ background: "hsl(var(--accent) / 0.1)", border: "1px solid hsl(var(--accent) / 0.15)" }}
                >
                  <s.icon className="h-4.5 w-4.5" style={{ color: "hsl(var(--accent))" }} />
                </div>
                <div>
                  <div className="text-sm font-extrabold" style={{ color: "hsl(var(--primary-foreground))" }}>
                    {s.value}
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: "hsl(var(--primary-foreground) / 0.55)" }}>
                    {s.label}
                  </div>
                </div>
              </motion.div>
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
