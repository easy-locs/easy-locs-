/**
 * Social proof strip — animated counters + infinite scrolling trust marquee
 */
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { Globe, Users, Building2, Star, CreditCard, Languages, Shield, Lock, Server, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface CounterProps {
  from: number;
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

const AnimatedCounter = ({ from, to, suffix = "", prefix = "", duration = 2.5 }: CounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(from);
  const rounded = useTransform(motionVal, (v) => `${prefix}${Math.round(v).toLocaleString()}${suffix}`);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return () => unsubscribe();
  }, [rounded]);

  return (
    <motion.span
      ref={ref}
      onViewportEnter={() => {
        animate(motionVal, to, { duration, ease: [0.22, 1, 0.36, 1] });
      }}
      viewport={{ once: true, margin: "-50px" }}
    >
      {prefix}{from}{suffix}
    </motion.span>
  );
};

const stats = [
  { icon: Globe, valueFrom: 0, valueTo: 190, suffix: "+", labelKey: "landing.proof.countries", fallback: "Countries", color: "accent" },
  { icon: Languages, valueFrom: 0, valueTo: 31, suffix: "", labelKey: "landing.proof.languages", fallback: "Languages", color: "info" },
  { icon: CreditCard, valueFrom: 0, valueTo: 120, suffix: "+", labelKey: "landing.proof.currencies", fallback: "Currencies", color: "success" },
  { icon: Building2, valueFrom: 0, valueTo: 50000, suffix: "+", labelKey: "landing.proof.properties", fallback: "Properties", color: "warning" },
  { icon: Users, valueFrom: 0, valueTo: 12000, suffix: "+", labelKey: "landing.proof.users", fallback: "Users", color: "info" },
  { icon: Star, valueFrom: 0, valueTo: 4, suffix: ".8", labelKey: "landing.proof.rating", fallback: "Rating", color: "accent" },
];

const TRUST_ITEMS = [
  { icon: Shield, label: "GDPR Compliant" },
  { icon: Lock, label: "SSL Encrypted" },
  { icon: Server, label: "99.9% Uptime" },
  { icon: Shield, label: "Stripe Verified" },
  { icon: Clock, label: "SOC 2 Ready" },
  { icon: Shield, label: "3D Secure" },
  { icon: Lock, label: "E2E Encrypted" },
  { icon: Server, label: "Multi-Region" },
];

const SocialProofStrip = () => {
  const { t } = useI18n();

  // Double the items for seamless loop
  const marqueeItems = [...TRUST_ITEMS, ...TRUST_ITEMS];

  return (
    <section className="py-12 sm:py-16 bg-background relative overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

      <div className="container max-w-5xl relative z-10">
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.labelKey}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.07, type: "spring", stiffness: 180, damping: 20 }}
              className="text-center space-y-2.5 group"
            >
              <motion.div
                className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto transition-all duration-300"
                style={{ background: `hsl(var(--${s.color}) / 0.08)` }}
                whileHover={{ scale: 1.15, rotate: 5, background: `hsl(var(--${s.color}) / 0.15)` }}
              >
                <s.icon className="h-5 w-5" style={{ color: `hsl(var(--${s.color}))` }} />
              </motion.div>
              <div className="text-xl sm:text-2xl font-extrabold text-foreground leading-none tracking-tight">
                <AnimatedCounter from={s.valueFrom} to={s.valueTo} suffix={s.suffix} />
              </div>
              <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t(s.labelKey) || s.fallback}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Infinite scrolling trust marquee */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="mt-10 relative overflow-hidden"
      >
        {/* Edge fades */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <motion.div
          className="flex gap-8 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {marqueeItems.map((item, i) => (
            <div
              key={`${item.label}-${i}`}
              className="inline-flex items-center gap-2 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest shrink-0"
            >
              <item.icon className="h-3.5 w-3.5 text-accent/40" />
              {item.label}
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
    </section>
  );
};

export default SocialProofStrip;
