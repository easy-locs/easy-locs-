import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import {
  Home, MessageSquare, FileSignature, CreditCard,
  CalendarRange, ConciergeBell, FileText, BrainCircuit,
} from "lucide-react";

const featureKeys = [
  { icon: Home, key: "landing.features.property", color: "accent" },
  { icon: MessageSquare, key: "landing.features.communication", color: "info" },
  { icon: FileSignature, key: "landing.features.contracts", color: "success" },
  { icon: CreditCard, key: "landing.features.payments", color: "warning" },
  { icon: CalendarRange, key: "landing.features.seasonal", color: "accent" },
  { icon: ConciergeBell, key: "landing.features.concierge", color: "info" },
  { icon: FileText, key: "landing.features.documents", color: "success" },
  { icon: BrainCircuit, key: "landing.features.ai", color: "warning" },
];

const Features = () => {
  const { t } = useI18n();

  return (
    <section id="features" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
        backgroundSize: "40px 40px",
      }} />

      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 space-y-4"
        >
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5">
            {t("landing.features.badge") || "Features"}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            {t("landing.features.title") || "Everything You Need to"}{" "}
            <span className="text-gradient-gold">{t("landing.features.title_highlight") || "Manage & Grow"}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
            {t("landing.features.subtitle") || "A complete suite of tools for property owners, managers, and concierge professionals."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureKeys.map((f, i) => (
            <motion.div
              key={f.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -6 }}
              className="group bg-card rounded-2xl p-6 border border-border/50 hover:border-accent/25 transition-all duration-300 relative overflow-hidden"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${f.color})), transparent)` }}
              />
              <div className="relative z-10">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `hsl(var(--${f.color}) / 0.1)` }}
                >
                  <f.icon className="h-5 w-5" style={{ color: `hsl(var(--${f.color}))` }} />
                </div>
                <h3 className="font-bold text-foreground text-sm mb-1.5">{t(`${f.key}.title`)}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(`${f.key}.desc`)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
