import { motion } from "framer-motion";
import { ShieldCheck, Globe, Cpu, BrainCircuit } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";

const items = [
  { icon: ShieldCheck, key: "secure", color: "success", fallback: "Secure Platform", desc: "End-to-end encryption, GDPR & international compliance" },
  { icon: Globe, key: "global", color: "info", fallback: "Global Infrastructure", desc: "190+ countries, multi-region hosting, 99.9% uptime" },
  { icon: Cpu, key: "automated", color: "warning", fallback: "Automated Management", desc: "Receipts, reminders, reports & workflows on autopilot" },
  { icon: BrainCircuit, key: "ai", color: "accent", fallback: "AI-Powered Tools", desc: "Smart documents, dynamic pricing & predictive analytics" },
];

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.12, type: "spring" as const, stiffness: 180, damping: 22 },
  }),
};

const TrustSection = () => {
  const { t } = useI18n();

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      {/* Dark gradient background for contrast */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(222 47% 6%) 40%, hsl(222 47% 6%) 60%, hsl(var(--background)) 100%)" }}
      />

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.04] blur-[140px] pointer-events-none" />

      <div className="container max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-5"
        >
          <motion.span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-full border backdrop-blur-md"
            style={{
              color: "hsl(var(--accent))",
              borderColor: "hsl(var(--accent) / 0.25)",
              background: "hsl(var(--accent) / 0.08)",
            }}
            whileHover={{ scale: 1.05 }}
          >
            {t("landing.trust.badge") || "Trust & Security"}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight" style={{ color: "hsl(40 50% 97%)" }}>
            {t("landing.trust.title") || "Built for"}{" "}
            <span className="text-gradient-gold">{t("landing.trust.highlight") || "Enterprise Reliability"}</span>
          </h2>
          <p className="text-base sm:text-lg max-w-lg mx-auto" style={{ color: "hsl(220 15% 60%)" }}>
            {t("landing.trust.subtitle") || "Security, compliance and performance you can trust at any scale."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((item, i) => (
            <motion.div
              key={item.key}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-30px" }}
              whileHover={{ y: -8, transition: { type: "spring", stiffness: 300 } }}
              className="group relative rounded-2xl border p-8 text-center transition-all duration-300 overflow-hidden"
              style={{
                borderColor: "hsl(220 20% 90% / 0.08)",
                background: "linear-gradient(160deg, hsl(220 30% 12% / 0.8), hsl(220 35% 8% / 0.6))",
                backdropFilter: "blur(20px)",
              }}
            >
              {/* Animated top line */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${item.color})), transparent)` }}
                initial={{ opacity: 0, scaleX: 0 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.6 }}
              />

              {/* Corner glow on hover */}
              <div
                className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-[60px] opacity-0 group-hover:opacity-25 transition-opacity duration-500"
                style={{ background: `hsl(var(--${item.color}))` }}
              />

              <motion.div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 relative"
                style={{ background: `hsl(var(--${item.color}) / 0.1)` }}
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.12 }}
                transition={{ duration: 0.5 }}
              >
                <item.icon className="h-7 w-7" style={{ color: `hsl(var(--${item.color}))` }} />
                {/* Glow ring */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ boxShadow: `0 0 24px hsl(var(--${item.color}) / 0.25)` }}
                />
              </motion.div>
              <h3 className="font-bold text-[15px] mb-2.5" style={{ color: "hsl(40 50% 97%)" }}>
                {t(`landing.trust.${item.key}`) || item.fallback}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(220 15% 55%)" }}>
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
