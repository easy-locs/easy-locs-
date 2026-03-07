import { motion } from "framer-motion";
import { Globe, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const regions = [
  { flag: "🇫🇷", name: "France", code: "FR" },
  { flag: "🇬🇧", name: "United Kingdom", code: "GB" },
  { flag: "🇩🇪", name: "Germany", code: "DE" },
  { flag: "🇪🇸", name: "Spain", code: "ES" },
  { flag: "🇮🇹", name: "Italy", code: "IT" },
  { flag: "🇵🇹", name: "Portugal", code: "PT" },
  { flag: "🇳🇱", name: "Netherlands", code: "NL" },
  { flag: "🇧🇪", name: "Belgium", code: "BE" },
  { flag: "🇨🇭", name: "Switzerland", code: "CH" },
  { flag: "🇦🇹", name: "Austria", code: "AT" },
  { flag: "🇵🇱", name: "Poland", code: "PL" },
  { flag: "🇬🇷", name: "Greece", code: "GR" },
];

const WorldMapSection = () => {
  return (
    <section className="py-20 sm:py-28 bg-background">
      <div className="container max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent mb-6">
            <Globe className="h-4 w-4" />
            110+ Countries Supported
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Manage Properties <span className="text-gradient-gold">Worldwide</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Each country has its own regulations, currencies, languages and document templates — fully separated and compliant.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {regions.map((r, i) => (
            <motion.div
              key={r.code}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                to="/login"
                className="group flex flex-col items-center gap-2 bg-card border border-border/50 rounded-xl p-4 hover:border-accent/30 hover:shadow-card-hover transition-all"
              >
                <span className="text-3xl">{r.flag}</span>
                <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
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
            View all 110+ countries
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default WorldMapSection;
