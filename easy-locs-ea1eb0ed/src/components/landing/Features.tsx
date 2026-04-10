import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import {
  Globe, Languages, Banknote, MessageSquare,
  CalendarRange, ShieldCheck,
} from "lucide-react";

const features = [
  { icon: Globe, key: "multi_country", color: "info", fallback: "Multi-Country", fallbackDesc: "Operate across 190+ countries with localized compliance and regulations." },
  { icon: Banknote, key: "multi_currency", color: "success", fallback: "Multi-Currency", fallbackDesc: "Accept payments in 120+ currencies with automatic conversion." },
  { icon: Languages, key: "multi_language", color: "accent", fallback: "Multi-Language", fallbackDesc: "Interface and documents available in 31 languages worldwide." },
  { icon: MessageSquare, key: "communication", color: "warning", fallback: "Centralized Communication", fallbackDesc: "Unified inbox for tenants, guests and service providers." },
  { icon: CalendarRange, key: "booking", color: "info", fallback: "Booking System", fallbackDesc: "Smart calendar with availability, pricing and channel sync." },
  { icon: ShieldCheck, key: "payments", color: "success", fallback: "Secure Payments", fallbackDesc: "Stripe, SEPA, bank transfer with automatic receipts." },
];

const Features = () => {
  const { t } = useI18n();

  return (
    <section id="features" aria-label="Features" className="py-24 sm:py-32 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--accent) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.3) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.04] blur-[150px] pointer-events-none" />

      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-16 space-y-4"
        >
          <motion.span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] px-5 py-2 rounded-full border"
            style={{ color: "hsl(var(--gold-light))", background: "hsl(var(--accent) / 0.1)", borderColor: "hsl(var(--accent) / 0.25)" }}
            whileHover={{ scale: 1.05 }}
          >
            {t("landing.features.badge") || "Global Platform"}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight" style={{ color: "hsl(var(--primary-foreground))" }}>
            {t("landing.features.title") || "Everything You Need to"}{" "}
            <span className="text-gradient-gold">{t("landing.features.title_highlight") || "Scale Globally"}</span>
          </h2>
          <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "hsl(var(--primary-foreground) / 0.65)" }}>
            {t("landing.features.subtitle") || "A complete suite of tools for property owners, managers, and service professionals worldwide."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="group rounded-2xl p-7 border transition-all duration-300 relative overflow-hidden"
              style={{ borderColor: "hsl(var(--primary-foreground) / 0.08)", background: "hsl(var(--primary-foreground) / 0.04)" }}
            >
              {/* Hover accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${f.color})), transparent)` }}
              />
              {/* Hover glow */}
              <div
                className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                style={{ background: `hsl(var(--${f.color}))` }}
              />
              <div className="relative z-10">
                <motion.div
                  className="w-13 h-13 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `hsl(var(--${f.color}) / 0.12)` }}
                  whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                  transition={{ duration: 0.4 }}
                >
                  <f.icon className="h-6 w-6" style={{ color: `hsl(var(--${f.color}))` }} />
                </motion.div>
                <h3 className="font-bold text-foreground text-base mb-2" style={{ color: "hsl(var(--primary-foreground))" }}>
                  {t(`landing.features.${f.key}.title`) || f.fallback}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--primary-foreground) / 0.6)" }}>
                  {t(`landing.features.${f.key}.desc`) || f.fallbackDesc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
