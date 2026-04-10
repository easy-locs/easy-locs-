import { Suspense, useState, lazy, type ComponentType } from "react";
import { motion } from "framer-motion";
import { Globe, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";

interface GlobeCanvasProps {
  onError?: () => void;
}

/* Lazy-load Three.js globe — always return a valid lazy module shape */
const NullFallback: ComponentType<GlobeCanvasProps> = () => null;
const GlobeCanvas = lazy(async (): Promise<{ default: ComponentType<GlobeCanvasProps> }> => {
  try {
    const mod = await import("./LandingGlobe");
    return { default: (mod.default as ComponentType<GlobeCanvasProps>) ?? NullFallback };
  } catch {
    return { default: NullFallback };
  }
});

const regions = [
  { flag: "🇫🇷", name: "France" },
  { flag: "🇬🇧", name: "UK" },
  { flag: "🇩🇪", name: "Germany" },
  { flag: "🇪🇸", name: "Spain" },
  { flag: "🇮🇹", name: "Italy" },
  { flag: "🇵🇹", name: "Portugal" },
  { flag: "🇳🇱", name: "Netherlands" },
  { flag: "🇧🇪", name: "Belgium" },
  { flag: "🇨🇭", name: "Switzerland" },
  { flag: "🇺🇸", name: "USA" },
  { flag: "🇯🇵", name: "Japan" },
  { flag: "🇦🇪", name: "UAE" },
  { flag: "🇧🇷", name: "Brazil" },
  { flag: "🇲🇦", name: "Morocco" },
  { flag: "🇹🇷", name: "Turkey" },
  { flag: "🇦🇺", name: "Australia" },
  { flag: "🇰🇷", name: "S. Korea" },
  { flag: "🇮🇳", name: "India" },
];

const WorldMapSection = () => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [globeFailed, setGlobeFailed] = useState(false);

  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      {/* Grid bg */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle, hsl(var(--accent)) 1px, transparent 1px)`,
        backgroundSize: "30px 30px",
      }} />
      {!isMobile && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.04] blur-[150px] pointer-events-none" />}

      <div className="container max-w-6xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 space-y-4"
        >
          <span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border"
            style={{ color: "hsl(var(--gold-light))", background: "hsl(var(--accent) / 0.1)", borderColor: "hsl(var(--accent) / 0.25)" }}
          >
            {t("landing.world.badge") || "190+ Countries"}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight" style={{ color: "hsl(var(--primary-foreground))" }}>
            {t("landing.world.title") || "Manage Properties"}{" "}
            <span className="text-gradient-gold">{t("landing.world.title_highlight") || "Worldwide"}</span>
          </h2>
          <p className="text-base sm:text-lg max-w-lg mx-auto" style={{ color: "hsl(var(--primary-foreground) / 0.5)" }}>
            {t("landing.world.subtitle") || "Each country has its own regulations, currencies, languages and document templates."}
          </p>
        </motion.div>

        {/* Globe + flags layout */}
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* 3D Globe — disabled on mobile for perf */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative aspect-square max-w-[480px] mx-auto w-full"
          >
            {isMobile || globeFailed ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-full border border-primary-foreground/10"
                style={{ background: "hsl(var(--primary-foreground) / 0.03)" }}
              >
                <Globe className="h-24 w-24 animate-pulse" style={{ color: "hsl(var(--accent) / 0.3)" }} />
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-accent/40" />
                  </div>
                }
              >
                <GlobeCanvas onError={() => setGlobeFailed(true)} />
              </Suspense>
            )}
          </motion.div>

          {/* Country flags grid */}
          <div>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
              {regions.map((r, i) => (
                <motion.div
                  key={r.name}
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.025 }}
                  whileHover={{ y: -3 }}
                >
                  <Link
                    to="/login"
                    className="group flex items-center gap-2.5 rounded-xl py-2.5 px-3 border transition-all"
                    style={{
                      borderColor: "hsl(var(--primary-foreground) / 0.06)",
                      background: "hsl(var(--primary-foreground) / 0.03)",
                    }}
                  >
                    <span className="text-xl">{r.flag}</span>
                    <span className="text-xs font-semibold truncate" style={{ color: "hsl(var(--primary-foreground) / 0.7)" }}>{r.name}</span>
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-6"
            >
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium hover:underline underline-offset-4"
                style={{ color: "hsl(var(--accent))" }}
              >
                {t("landing.world.cta") || "View all 190+ countries"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorldMapSection;
