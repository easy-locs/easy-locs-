import { motion } from "framer-motion";
import { Globe, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

const regions = [
  { flag: "🇫🇷", key: "France", code: "FR" },
  { flag: "🇬🇧", key: "United Kingdom", code: "GB" },
  { flag: "🇩🇪", key: "Germany", code: "DE" },
  { flag: "🇪🇸", key: "Spain", code: "ES" },
  { flag: "🇮🇹", key: "Italy", code: "IT" },
  { flag: "🇵🇹", key: "Portugal", code: "PT" },
  { flag: "🇳🇱", key: "Netherlands", code: "NL" },
  { flag: "🇧🇪", key: "Belgium", code: "BE" },
  { flag: "🇨🇭", key: "Switzerland", code: "CH" },
  { flag: "🇦🇹", key: "Austria", code: "AT" },
  { flag: "🇵🇱", key: "Poland", code: "PL" },
  { flag: "🇬🇷", key: "Greece", code: "GR" },
  { flag: "🇺🇸", key: "United States", code: "US" },
  { flag: "🇯🇵", key: "Japan", code: "JP" },
  { flag: "🇦🇪", key: "UAE", code: "AE" },
  { flag: "🇧🇷", key: "Brazil", code: "BR" },
  { flag: "🇲🇦", key: "Morocco", code: "MA" },
  { flag: "🇹🇷", key: "Turkey", code: "TR" },
];

const WorldMapSection = () => {
  const { t } = useI18n();

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      {/* Animated globe grid bg */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle, hsl(var(--accent)) 1px, transparent 1px)`,
        backgroundSize: '30px 30px',
      }} />

      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent mb-6">
            <Globe className="h-4 w-4" />
            {t("landing.world.badge") || "110+ Countries Supported"}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {t("landing.world.title") || "Manage Properties"} <span className="text-gradient-gold">{t("landing.world.title_highlight") || "Worldwide"}</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            {t("landing.world.subtitle") || "Each country has its own regulations, currencies, languages and document templates — fully separated and compliant."}
          </p>
        </motion.div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-3">
          {regions.map((r, i) => (
            <motion.div
              key={r.code}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ scale: 1.08, y: -4 }}
            >
              <Link
                to="/login"
                className="group flex flex-col items-center gap-2 bg-card border border-border/50 rounded-xl p-4 hover:border-accent/30 transition-all relative overflow-hidden"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(circle at 50% 50%, hsl(var(--accent) / 0.06), transparent 70%)' }} />
                <span className="text-3xl relative z-10">{r.flag}</span>
                <span className="text-xs font-medium text-foreground truncate relative z-10">{r.key}</span>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-8"
        >
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline underline-offset-4"
          >
            {t("landing.world.cta") || "View all 110+ countries"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default WorldMapSection;
