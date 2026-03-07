import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import {
  Home, MessageSquare, FileSignature, CreditCard,
  CalendarRange, ConciergeBell, FileText, BrainCircuit,
} from "lucide-react";

const featureKeys = [
  { icon: Home, key: "landing.features.property", accent: "accent" },
  { icon: MessageSquare, key: "landing.features.communication", accent: "info" },
  { icon: FileSignature, key: "landing.features.contracts", accent: "success" },
  { icon: CreditCard, key: "landing.features.payments", accent: "warning" },
  { icon: CalendarRange, key: "landing.features.seasonal", accent: "accent" },
  { icon: ConciergeBell, key: "landing.features.concierge", accent: "info" },
  { icon: FileText, key: "landing.features.documents", accent: "success" },
  { icon: BrainCircuit, key: "landing.features.ai", accent: "warning" },
];

const Features = () => {
  const { t } = useI18n();

  return (
    <section id="features" className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }} />

      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5"
          >
            {t("landing.features.badge") || "Features"}
          </motion.span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4">
            {t("landing.features.title") || "Everything You Need to"}{" "}
            <span className="text-gradient-gold">{t("landing.features.title_highlight") || "Manage & Grow"}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            {t("landing.features.subtitle") || "A complete suite of tools for property owners, managers, and concierge professionals."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featureKeys.map((f, i) => (
            <motion.div
              key={f.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="group relative bg-card rounded-2xl p-6 border border-border/50 hover:border-accent/30 transition-all duration-300 overflow-hidden"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{ background: `radial-gradient(circle at 50% 0%, hsl(var(--${f.accent}) / 0.08) 0%, transparent 70%)` }}
              />
              {/* Animated border glow */}
              <motion.div
                className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(135deg, hsl(var(--${f.accent}) / 0.2), transparent 50%, hsl(var(--${f.accent}) / 0.1))` }}
              />
              <div className="relative z-10">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                  style={{ background: `hsl(var(--${f.accent}) / 0.1)` }}
                >
                  <f.icon className="h-5 w-5" style={{ color: `hsl(var(--${f.accent}))` }} />
                </div>
                <h3 className="font-bold text-foreground text-sm mb-2">{t(`${f.key}.title`)}</h3>
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
