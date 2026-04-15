import { ArrowRight, Zap, Globe, CreditCard, Languages } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";

function useCountUp(target: number, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
}

function DotGrid({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (time: number) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const gap = 40;
      const cols = Math.ceil(w / gap);
      const rows = Math.ceil(h / gap);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * gap + gap / 2;
          const y = r * gap + gap / 2;
          const wave = Math.sin(time * 0.001 + c * 0.3 + r * 0.3) * 0.5 + 0.5;
          const alpha = 0.04 + wave * 0.06;
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(168, 72%, 44%, ${alpha})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);

  if (reduced) return null;
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />;
}

const orbVariants = [
  { color: "hsl(168 72% 44% / 0.07)", size: 500, x: "15%", y: "10%", dx: 30, dy: 20, dur: 20 },
  { color: "hsl(225 60% 50% / 0.05)", size: 400, x: "70%", y: "60%", dx: -25, dy: -15, dur: 25 },
  { color: "hsl(280 50% 50% / 0.04)", size: 350, x: "50%", y: "30%", dx: 15, dy: 25, dur: 22 },
];

const stats = [
  { icon: Globe, value: 190, suffix: "+", label: "countries" },
  { icon: CreditCard, value: 0, suffix: "%", label: "fees for you" },
  { icon: Languages, value: 120, suffix: "+", label: "currencies" },
];

function StatBadge({ icon: Icon, value, suffix, label, delay, reduced }: {
  icon: typeof Globe; value: number; suffix: string; label: string; delay: number; reduced: boolean;
}) {
  const [started, setStarted] = useState(reduced);
  const count = useCountUp(value, reduced ? 0 : 1800, started);

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { delay, duration: 0.5 }}
      onAnimationComplete={() => setStarted(true)}
      className="flex items-center gap-2 text-white/70"
    >
      <Icon className="h-4 w-4 text-[hsl(168_72%_44%)] shrink-0" aria-hidden="true" />
      <span className="text-sm font-bold text-white tabular-nums">{count}{suffix}</span>
      <span className="text-xs text-white/50">{label}</span>
    </motion.div>
  );
}

const wordVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const Hero = () => {
  const { t } = useI18n();
  const reduced = useReducedMotion() ?? false;

  const headline = t("landing.hero.intent_consumer") || "One platform. Everything around you.";
  const subheadline = t("landing.hero.intent_consumer_sub") || "Order, ride, send, pay — zero fees for you.";
  const words = headline.split(" ");

  return (
    <section
      aria-label="Easy-Locs — Global super-app for food, services, taxi, hotel, delivery"
      className="relative overflow-hidden min-h-[90vh] sm:min-h-[85vh] flex items-center justify-center bg-[linear-gradient(170deg,hsl(225_28%_4%)_0%,hsl(225_24%_9%)_50%,hsl(225_20%_6%)_100%)]"
      itemScope
      itemType="https://schema.org/WebApplication"
    >
      <meta itemProp="name" content="Easy-Locs" />
      <meta itemProp="applicationCategory" content="BusinessApplication" />

      <DotGrid reduced={reduced} />

      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {orbVariants.map((orb, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: orb.size,
              height: orb.size,
              left: orb.x,
              top: orb.y,
              background: `radial-gradient(circle, ${orb.color} 0%, transparent 60%)`,
              willChange: "transform",
            }}
            animate={reduced ? undefined : {
              x: [0, orb.dx, -orb.dx * 0.5, 0],
              y: [0, orb.dy, -orb.dy * 0.5, 0],
            }}
            transition={reduced ? undefined : {
              duration: orb.dur,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 sm:px-8 text-center space-y-6 sm:space-y-8 py-20 sm:py-24">
        <h1
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] text-[hsl(210_20%_97%)]"
          itemProp="description"
        >
          {reduced ? headline : words.map((word, i) => (
            <motion.span
              key={i}
              custom={i}
              variants={wordVariant}
              initial="hidden"
              animate="visible"
              className="inline-block mr-[0.3em]"
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { delay: 0.7, duration: 0.5 }}
          className="text-base sm:text-lg max-w-md mx-auto leading-relaxed text-muted-foreground"
        >
          {subheadline}
        </motion.p>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { delay: 0.9, duration: 0.5 }}
          className="w-full max-w-lg mx-auto"
        >
          <UnifiedSearchBar variant="hero" placeholder={t("landing.hero.search_placeholder") || "Search food, hotels, shops, services..."} />
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { delay: 1.0, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
        >
          <Link
            to="/signup"
            className="group relative inline-flex items-center justify-center gap-2 h-12 px-8 rounded-2xl text-sm font-bold w-full sm:w-auto transition-transform active:scale-[0.97] bg-accent text-accent-foreground overflow-hidden"
          >
            <span className="absolute inset-0 rounded-2xl animate-[ctaPulse_3s_ease-in-out_infinite] bg-accent/30 pointer-events-none motion-reduce:animate-none" aria-hidden="true" />
            <Zap className="h-4 w-4 relative z-10" />
            <span className="relative z-10">{t("landing.hero.cta_start") || "Start now — free"}</span>
            <ArrowRight className="h-4 w-4 relative z-10" />
          </Link>
          <Link
            to="/business"
            className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl text-sm font-semibold border border-border/12 text-muted-foreground bg-muted-foreground/4 w-full sm:w-auto transition-colors"
          >
            {t("landing.hero.launch_business") || "Launch your business"}
          </Link>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reduced ? { duration: 0 } : { delay: 1.3, duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 pt-4"
          aria-label="Platform statistics"
        >
          {stats.map((s, i) => (
            <StatBadge key={s.label} {...s} delay={1.4 + i * 0.15} reduced={reduced} />
          ))}
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" aria-hidden="true" />
    </section>
  );
};

export default Hero;
