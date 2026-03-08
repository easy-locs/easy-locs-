import { motion } from "framer-motion";
import { ShieldCheck, Globe, Cpu, BrainCircuit } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const items = [
  { icon: ShieldCheck, key: "secure", color: "success", fallback: "Secure Platform", desc: "End-to-end encryption, GDPR & international compliance" },
  { icon: Globe, key: "global", color: "info", fallback: "Global Infrastructure", desc: "110+ countries, multi-region hosting, 99.9% uptime" },
  { icon: Cpu, key: "automated", color: "warning", fallback: "Automated Management", desc: "Receipts, reminders, reports & workflows on autopilot" },
  { icon: BrainCircuit, key: "ai", color: "accent", fallback: "AI-Powered Tools", desc: "Smart documents, dynamic pricing & predictive analytics" },
];

const TrustSection = () => {
  const { t } = useI18n();

  return (
    <section className="py-24 sm:py-32 bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent/[0.02] blur-[120px] pointer-events-none" />

      <div className="container max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5">
            {t("landing.trust.badge") || "Trust & Security"}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            {t("landing.trust.title") || "Built for"}{" "}
            <span className="text-gradient-gold">{t("landing.trust.highlight") || "Enterprise Reliability"}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
            {t("landing.trust.subtitle") || "Security, compliance and performance you can trust at any scale."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -5 }}
              className="group bg-card border border-border/50 rounded-2xl p-7 text-center transition-all duration-300 hover:border-accent/20 relative overflow-hidden"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${item.color})), transparent)` }}
              />
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{ background: `hsl(var(--${item.color}) / 0.1)` }}
              >
                <item.icon className="h-7 w-7" style={{ color: `hsl(var(--${item.color}))` }} />
              </div>
              <h3 className="font-bold text-sm text-foreground mb-2">
                {t(`landing.trust.${item.key}`) || item.fallback}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(`landing.trust.${item.key}_desc`) || item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
