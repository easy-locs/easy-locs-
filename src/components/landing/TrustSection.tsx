import { motion } from "framer-motion";
import { ShieldCheck, Globe, Cpu, BrainCircuit } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const items = [
  { icon: ShieldCheck, key: "secure", color: "success", fallback: "Secure Platform", desc: "End-to-end encryption & GDPR compliant" },
  { icon: Globe, key: "global", color: "info", fallback: "Global Infrastructure", desc: "110+ countries, multi-region hosting" },
  { icon: Cpu, key: "automated", color: "warning", fallback: "Automated Management", desc: "Receipts, reminders & reports on autopilot" },
  { icon: BrainCircuit, key: "ai", color: "accent", fallback: "AI-Powered Tools", desc: "Smart documents, pricing & analytics" },
];

const TrustSection = () => {
  const { t } = useI18n();

  return (
    <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
      <div className="container max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 space-y-3"
        >
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5">
            {t("landing.trust.badge") || "Trust"}
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground leading-tight">
            {t("landing.trust.title") || "Built for"}{" "}
            <span className="text-gradient-gold">{t("landing.trust.highlight") || "Reliability"}</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="bg-card border border-border/50 rounded-2xl p-6 text-center transition-all duration-300 hover:border-accent/20"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: `hsl(var(--${item.color}) / 0.1)` }}
              >
                <item.icon className="h-6 w-6" style={{ color: `hsl(var(--${item.color}))` }} />
              </div>
              <h3 className="font-bold text-sm text-foreground mb-1">
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
