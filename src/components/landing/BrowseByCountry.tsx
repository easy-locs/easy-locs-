import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";

const CONTINENTS = [
  {
    name: "Europe",
    countries: [
      { name: "France", slug: "france", flag: "🇫🇷" },
      { name: "Spain", slug: "spain", flag: "🇪🇸" },
      { name: "Portugal", slug: "portugal", flag: "🇵🇹" },
      { name: "Italy", slug: "italy", flag: "🇮🇹" },
      { name: "Germany", slug: "germany", flag: "🇩🇪" },
      { name: "UK", slug: "united-kingdom", flag: "🇬🇧" },
    ],
  },
  {
    name: "Middle East",
    countries: [
      { name: "UAE", slug: "uae", flag: "🇦🇪" },
      { name: "Turkey", slug: "turkey", flag: "🇹🇷" },
    ],
  },
  {
    name: "Africa",
    countries: [
      { name: "Morocco", slug: "morocco", flag: "🇲🇦" },
    ],
  },
  {
    name: "Asia",
    countries: [
      { name: "Thailand", slug: "thailand", flag: "🇹🇭" },
      { name: "Japan", slug: "japan", flag: "🇯🇵" },
      { name: "Indonesia", slug: "indonesia", flag: "🇮🇩" },
    ],
  },
];

const BrowseByCountry = () => (
  <section id="countries" className="py-16 sm:py-20 px-4 bg-background">
    <div className="container mx-auto max-w-6xl">
      <div className="text-center mb-10">
        <motion.span
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-4"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Globe className="h-3.5 w-3.5" />
          110+ Countries
        </motion.span>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Browse by Country</h2>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl mx-auto">
          Discover properties and services across every continent
        </p>
      </div>

      <div className="space-y-8">
        {CONTINENTS.map((continent) => (
          <div key={continent.name}>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3 px-1">
              {continent.name}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {continent.countries.map((c, i) => (
                <motion.div
                  key={c.slug}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to={`/country/${c.slug}`}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card p-3.5 hover:border-primary/40 hover:shadow-md transition-all group"
                  >
                    <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform shrink-0">{c.flag}</span>
                    <span className="text-sm font-semibold text-foreground truncate">{c.name}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link to="/locations" className="text-sm font-medium text-accent hover:underline">
          View all countries →
        </Link>
      </div>
    </div>
  </section>
);

export default BrowseByCountry;
