import { motion } from "framer-motion";
import { ShieldCheck, Globe, Cpu, BrainCircuit } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const items = [
  { icon: ShieldCheck, key: "secure", color: "success", fallback: "Secure Platform", desc: "End-to-end encryption, GDPR & international compliance" },
  { icon: Globe, key: "global", color: "info", fallback: "Global Infrastructure", desc: "190+ countries, multi-region hosting, 99.9% uptime" },
  { icon: Cpu, key: "automated", color: "warning", fallback: "Automated Management", desc: "Receipts, reminders, reports & workflows on autopilot" },
  { icon: BrainCircuit, key: "ai", color: "accent", fallback: "AI-Powered Tools", desc: "Smart documents, dynamic pricing & predictive analytics" },
];

const TrustSection = () => {
  const { t } = useI18n();

  return (
    <section className="py-16 sm:py-24 bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent/[0.03] blur-[120px] pointer-events-none" />

      <div className="container max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-16 space-y-4"
        >
          <motion.span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5"
            whileHover={{ scale: 1.05 }}
          >
            {t("landing.trust.badge") || "Trust & Security"}
          </motion.span>
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
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="group bg-card border border-border/50 rounded-2xl p-7 text-center transition-all duration-300 hover:border-accent/25 relative overflow-hidden"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              {/* Animated top line */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${item.color})), transparent)` }}
                initial={{ opacity: 0, scaleX: 0 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
              />
              {/* Hover glow */}
              <div
                className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[50px] opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                style={{ background: `hsl(var(--${item.color}))` }}
              />
              <motion.div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: `hsl(var(--${item.color}) / 0.1)` }}
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
              >
                <item.icon className="h-7 w-7" style={{ color: `hsl(var(--${item.color}))` }} />
              </motion.div>
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
