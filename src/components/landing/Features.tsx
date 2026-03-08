import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import {
  Globe, Languages, Banknote, MessageSquare,
  CalendarRange, ShieldCheck,
} from "lucide-react";

const features = [
  { icon: Globe, key: "multi_country", color: "info", fallback: "Multi-Country" },
  { icon: Banknote, key: "multi_currency", color: "success", fallback: "Multi-Currency" },
  { icon: Languages, key: "multi_language", color: "accent", fallback: "Multi-Language" },
  { icon: MessageSquare, key: "communication", color: "warning", fallback: "Centralized Communication" },
  { icon: CalendarRange, key: "booking", color: "info", fallback: "Booking System" },
  { icon: ShieldCheck, key: "payments", color: "success", fallback: "Secure Payments" },
];

const Features = () => {
  const { t } = useI18n();

  return (
    <section id="features" className="py-20 sm:py-28 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--accent) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.3) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      <div className="container max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 space-y-3"
        >
          <span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border"
            style={{ color: "hsl(var(--gold-light))", background: "hsl(var(--accent) / 0.1)", borderColor: "hsl(var(--accent) / 0.25)" }}
          >
            {t("landing.features.badge") || "Platform"}
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight" style={{ color: "hsl(var(--primary-foreground))" }}>
            {t("landing.features.title") || "A Global Platform"}{" "}
            <span className="text-gradient-gold">{t("landing.features.title_highlight") || "Built for Scale"}</span>
          </h2>
          <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: "hsl(var(--primary-foreground) / 0.5)" }}>
            {t("landing.features.subtitle") || "Everything you need to manage properties and services worldwide."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className="group rounded-2xl p-6 border transition-all duration-300 relative overflow-hidden"
              style={{ borderColor: "hsl(var(--primary-foreground) / 0.06)", background: "hsl(var(--primary-foreground) / 0.03)" }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${f.color})), transparent)` }}
              />
              <div className="relative z-10">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `hsl(var(--${f.color}) / 0.12)` }}
                >
                  <f.icon className="h-5 w-5" style={{ color: `hsl(var(--${f.color}))` }} />
                </div>
                <h3 className="font-bold text-sm mb-1.5" style={{ color: "hsl(var(--primary-foreground))" }}>
                  {t(`landing.features.${f.key}.title`) || f.fallback}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--primary-foreground) / 0.45)" }}>
                  {t(`landing.features.${f.key}.desc`) || ""}
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
