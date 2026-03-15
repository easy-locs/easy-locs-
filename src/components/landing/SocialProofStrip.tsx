/**
 * Social proof strip — animated counters & trust indicators
 */
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { Globe, Users, Building2, Star, CreditCard, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface CounterProps {
  from: number;
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

const AnimatedCounter = ({ from, to, suffix = "", prefix = "", duration = 2 }: CounterProps) => {
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
        animate(motionVal, to, { duration, ease: "easeOut" });
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
  { icon: Building2, valueFrom: 0, valueTo: 50000, suffix: "+", labelKey: "landing.proof.properties", fallback: "Properties Managed", color: "warning" },
  { icon: Users, valueFrom: 0, valueTo: 12000, suffix: "+", labelKey: "landing.proof.users", fallback: "Active Users", color: "info" },
  { icon: Star, valueFrom: 0, valueTo: 4, suffix: ".8 ★", labelKey: "landing.proof.rating", fallback: "User Rating", color: "accent" },
];

const TRUST_BADGES = [
  { labelKey: "landing.proof.trust_gdpr", fallback: "GDPR Compliant" },
  { labelKey: "landing.proof.trust_stripe", fallback: "Stripe Verified" },
  { labelKey: "landing.proof.trust_ssl", fallback: "SSL Encrypted" },
  { labelKey: "landing.proof.trust_uptime", fallback: "99.9% Uptime" },
  { labelKey: "landing.proof.trust_soc2", fallback: "SOC 2 Ready" },
];

const SocialProofStrip = () => {
  const { t } = useI18n();

  return (
    <section className="py-10 sm:py-14 bg-background relative overflow-hidden border-b border-border/30">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-accent/[0.02] blur-[100px] pointer-events-none" />

      <div className="container max-w-5xl relative z-10">
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.labelKey}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 200 }}
              className="text-center space-y-2"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
                style={{ background: `hsl(var(--${s.color}) / 0.08)` }}
              >
                <s.icon className="h-4.5 w-4.5" style={{ color: `hsl(var(--${s.color}))` }} />
              </div>
              <div className="text-lg sm:text-2xl font-extrabold text-foreground leading-none">
                <AnimatedCounter from={s.valueFrom} to={s.valueTo} suffix={s.suffix} />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t(s.labelKey) || s.fallback}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust logos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest"
        >
          {TRUST_BADGES.map((badge) => (
            <span key={badge.labelKey} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success/40" />
              {t(badge.labelKey) || badge.fallback}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SocialProofStrip;
