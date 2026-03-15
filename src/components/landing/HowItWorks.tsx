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
      {/* Subtle ambient glow — desktop only */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-accent/[0.025] blur-[140px] pointer-events-none hidden sm:block" />

      <div className="container max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-5"
        >
          <motion.span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-2 rounded-full border border-accent/20 bg-accent/5"
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

        {/* Steps with connecting line */}
        <div className="relative">
          {/* Connecting line — desktop only */}
          <div className="hidden lg:block absolute top-[3.5rem] left-[calc(12.5%+1rem)] right-[calc(12.5%+1rem)] h-px">
            <motion.div
              className="h-full w-full"
              style={{ background: "linear-gradient(90deg, hsl(var(--accent) / 0.3), hsl(var(--info) / 0.3), hsl(var(--success) / 0.3), hsl(var(--warning) / 0.3))" }}
              initial={{ scaleX: 0, originX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: i * 0.12, type: "spring", stiffness: 180, damping: 22 }}
                className="group relative"
              >
                <motion.div
                  whileHover={{ y: -8, transition: { type: "spring", stiffness: 300 } }}
                  className="relative rounded-2xl border p-7 transition-all duration-300 overflow-hidden h-full"
                  style={{
                    borderColor: `hsl(var(--${s.color}) / 0.1)`,
                    background: `linear-gradient(160deg, hsl(var(--${s.color}) / 0.04) 0%, transparent 60%)`,
                  }}
                >
                  {/* Number watermark */}
                  <div
                    className="absolute top-2 right-4 text-5xl font-black opacity-[0.04] select-none"
                    style={{ color: `hsl(var(--${s.color}))` }}
                  >
                    {s.num}
                  </div>

                  {/* Step indicator dot */}
                  <motion.div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 relative"
                    style={{ background: `hsl(var(--${s.color}) / 0.1)` }}
                    whileHover={{ rotate: [0, -8, 8, 0], scale: 1.15 }}
                    transition={{ duration: 0.5 }}
                  >
                    <s.icon className="h-5 w-5" style={{ color: `hsl(var(--${s.color}))` }} />
                    {/* Pulse ring on hover */}
                    <div
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ boxShadow: `0 0 20px hsl(var(--${s.color}) / 0.2)` }}
                    />
                  </motion.div>

                  <h3 className="font-bold text-[15px] text-foreground mb-2">
                    {t(s.titleKey) || s.fallbackTitle}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(s.descKey) || s.fallbackDesc}
                  </p>

                  {/* Bottom accent line on hover */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${s.color})), transparent)` }}
                    initial={{ opacity: 0, scaleX: 0 }}
                    whileInView={{ opacity: 0.5, scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 + i * 0.15, duration: 0.6 }}
                  />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-14"
        >
          <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 h-13 px-10 rounded-2xl text-sm font-bold transition-all relative overflow-hidden"
              style={{
                background: "var(--gradient-gold)",
                color: "hsl(var(--accent-foreground))",
                boxShadow: "0 0 30px hsl(var(--accent) / 0.25), 0 4px 16px hsl(0 0% 0% / 0.15)",
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                {t("landing.how.cta") || "Start Building Now"}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform duration-300" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
