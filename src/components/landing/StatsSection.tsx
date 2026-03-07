import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 10000, suffix: "+", label: "Properties Managed", icon: "🏠" },
  { value: 110, suffix: "+", label: "Countries Supported", icon: "🌍" },
  { value: 50000, suffix: "+", label: "Documents Generated", icon: "📄" },
  { value: 2, prefix: "€", suffix: "M+", label: "Payments Processed", icon: "💳" },
];

const AnimatedCounter = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) { setStarted(true); } },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
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
    <div ref={ref} className="text-4xl sm:text-5xl font-extrabold text-gradient-gold tabular-nums tracking-tight">
      {prefix}{display.toLocaleString()}{suffix}
    </div>
  );
};

const StatsSection = () => {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      {/* Background accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.04) 0%, transparent 70%)' }}
      />

      <div className="container max-w-5xl relative z-10">
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
            Trusted Worldwide
          </motion.span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4">
            Trusted by <span className="text-gradient-gold">Property Professionals</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
            Powering property management operations across the globe.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4, scale: 1.03 }}
              className="relative bg-card border border-border/50 rounded-2xl p-6 sm:p-8 text-center transition-all duration-300 overflow-hidden group"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              {/* Glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(circle at 50% 100%, hsl(var(--accent) / 0.06) 0%, transparent 70%)' }}
              />
              <div className="relative z-10">
                <div className="text-3xl mb-3">{stat.icon}</div>
                <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                <div className="text-sm text-muted-foreground font-medium mt-2">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
