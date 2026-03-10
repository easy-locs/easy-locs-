import { motion } from "framer-motion";
import { Rocket, Globe, CreditCard, BarChart3, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

const steps = [
  {
    num: "01",
    icon: Rocket,
    titleKey: "landing.how.step1_title",
    descKey: "landing.how.step1_desc",
    fallbackTitle: "Create Your Account",
    fallbackDesc: "Sign up in 30 seconds. No credit card required. Set up your first property or service in minutes.",
    color: "accent",
  },
  {
    num: "02",
    icon: Globe,
    titleKey: "landing.how.step2_title",
    descKey: "landing.how.step2_desc",
    fallbackTitle: "Add Properties & Services",
    fallbackDesc: "List rentals, create service offerings, and configure pricing across any city worldwide.",
    color: "info",
  },
  {
    num: "03",
    icon: CreditCard,
    titleKey: "landing.how.step3_title",
    descKey: "landing.how.step3_desc",
    fallbackTitle: "Collect Payments",
    fallbackDesc: "Accept rent, bookings, and service payments via Stripe, SEPA, or bank transfer in 120+ currencies.",
    color: "success",
  },
  {
    num: "04",
    icon: BarChart3,
    titleKey: "landing.how.step4_title",
    descKey: "landing.how.step4_desc",
    fallbackTitle: "Scale & Grow",
    fallbackDesc: "Track revenue, expand to new cities, and manage everything remotely from a single dashboard.",
    color: "warning",
  },
];

const HowItWorks = () => {
  const { t } = useI18n();

  return (
    <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-accent/[0.03] blur-[120px] pointer-events-none" />

      <div className="container max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-14 space-y-4"
        >
          <motion.span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5"
            whileHover={{ scale: 1.05 }}
          >
            {t("landing.how.badge") || "How It Works"}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            {t("landing.how.heading") || "Get Started in"}{" "}
            <span className="text-gradient-gold">{t("landing.how.heading_hl") || "4 Simple Steps"}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            {t("landing.how.subtitle") || "From sign-up to your first payment — here's how Easy-Locs helps you build a global business."}
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="group relative rounded-2xl border p-6 transition-all duration-300 overflow-hidden"
              style={{
                borderColor: `hsl(var(--${s.color}) / 0.1)`,
                background: `linear-gradient(160deg, hsl(var(--${s.color}) / 0.04) 0%, transparent 60%)`,
              }}
            >
              {/* Number watermark */}
              <div
                className="absolute top-3 right-4 text-4xl font-black opacity-[0.04] select-none"
                style={{ color: `hsl(var(--${s.color}))` }}
              >
                {s.num}
              </div>

              {/* Connecting line (visible on lg) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px" style={{ background: `hsl(var(--${s.color}) / 0.15)` }} />
              )}

              <motion.div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `hsl(var(--${s.color}) / 0.1)` }}
                whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                transition={{ duration: 0.4 }}
              >
                <s.icon className="h-5 w-5" style={{ color: `hsl(var(--${s.color}))` }} />
              </motion.div>

              <h3 className="font-bold text-sm text-foreground mb-1.5">
                {t(s.titleKey) || s.fallbackTitle}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(s.descKey) || s.fallbackDesc}
              </p>

              {/* Bottom accent line on hover */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${s.color})), transparent)` }}
              />
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 h-12 px-8 rounded-xl text-sm font-bold transition-all relative overflow-hidden"
              style={{
                background: "var(--gradient-gold)",
                color: "hsl(var(--accent-foreground))",
                boxShadow: "0 0 24px hsl(var(--accent) / 0.2)",
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                {t("landing.how.cta") || "Start Building Now"}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
