import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";

const COUNTRIES = [
  { name: "UAE", slug: "uae", flag: "🇦🇪", code: "AE" },
  { name: "France", slug: "france", flag: "🇫🇷", code: "FR" },
  { name: "Morocco", slug: "morocco", flag: "🇲🇦", code: "MA" },
  { name: "Thailand", slug: "thailand", flag: "🇹🇭", code: "TH" },
  { name: "Spain", slug: "spain", flag: "🇪🇸", code: "ES" },
  { name: "Portugal", slug: "portugal", flag: "🇵🇹", code: "PT" },
  { name: "Italy", slug: "italy", flag: "🇮🇹", code: "IT" },
  { name: "Germany", slug: "germany", flag: "🇩🇪", code: "DE" },
  { name: "UK", slug: "united-kingdom", flag: "🇬🇧", code: "GB" },
  { name: "Turkey", slug: "turkey", flag: "🇹🇷", code: "TR" },
];

const BrowseByCountry = () => (
  <section className="py-16 sm:py-20 px-4 bg-background">
    <div className="container mx-auto max-w-6xl">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Browse by Country</h2>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl mx-auto">
          Discover properties and services in countries where Easy-Locs operates
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        {COUNTRIES.map((c, i) => (
          <motion.div
            key={c.slug}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              to={`/country/${c.slug}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-4 sm:p-5 hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <span className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform">{c.flag}</span>
              <span className="text-sm font-semibold text-foreground">{c.name}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default BrowseByCountry;
