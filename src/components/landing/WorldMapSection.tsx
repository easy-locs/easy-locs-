import { motion } from "framer-motion";
import { Globe, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

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
  { flag: "🇦🇹", name: "Austria" },
  { flag: "🇵🇱", name: "Poland" },
  { flag: "🇬🇷", name: "Greece" },
  { flag: "🇺🇸", name: "USA" },
  { flag: "🇯🇵", name: "Japan" },
  { flag: "🇦🇪", name: "UAE" },
  { flag: "🇧🇷", name: "Brazil" },
  { flag: "🇲🇦", name: "Morocco" },
  { flag: "🇹🇷", name: "Turkey" },
];

const WorldMapSection = () => {
  const { t } = useI18n();

  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      <div className="container max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 space-y-4"
        >
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5">
            <Globe className="h-3.5 w-3.5" />
            {t("landing.world.badge") || "110+ Countries"}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            {t("landing.world.title") || "Manage Properties"}{" "}
            <span className="text-gradient-gold">{t("landing.world.title_highlight") || "Worldwide"}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
            {t("landing.world.subtitle") || "Each country has its own regulations, currencies, languages and document templates."}
          </p>
        </motion.div>

        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-3">
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
                className="group flex flex-col items-center gap-1.5 bg-card border border-border/50 rounded-xl py-3 px-2 hover:border-accent/25 transition-all"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <span className="text-2xl">{r.flag}</span>
                <span className="text-[10px] font-semibold text-foreground truncate w-full text-center">{r.name}</span>
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
