import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

const AnimatedCounter = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 2000;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, value]);

  return (
    <div ref={ref} className="text-3xl sm:text-4xl font-extrabold text-gradient-gold tabular-nums tracking-tight">
      {prefix}{display.toLocaleString()}{suffix}
    </div>
  );
};

const StatsSection = () => {
  const { t } = useI18n();

  const stats = [
    { value: 10000, suffix: "+", label: t("landing.stats.properties"), icon: "🏠" },
    { value: 190, suffix: "+", label: t("landing.stats.countries"), icon: "🌍" },
    { value: 50000, suffix: "+", label: t("landing.stats.documents"), icon: "📄" },
    { value: 2, prefix: "€", suffix: "M+", label: t("landing.stats.payments"), icon: "💳" },
  ];

  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent/[0.03] blur-[120px] pointer-events-none" />

      <div className="container max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 space-y-4"
        >
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5">
            {t("landing.stats.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            {t("landing.stats.title")} <span className="text-gradient-gold">{t("landing.stats.title_highlight")}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
            {t("landing.stats.subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="bg-card border border-border/50 rounded-2xl p-6 text-center transition-all duration-300 hover:border-accent/20"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="text-2xl mb-3">{stat.icon}</div>
              <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              <div className="text-xs text-muted-foreground font-medium mt-2">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
