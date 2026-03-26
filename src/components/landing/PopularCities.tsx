import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const CITIES = [
  { name: "Dubai", slug: "dubai", country: "UAE", flag: "🇦🇪" },
  { name: "Paris", slug: "paris", country: "France", flag: "🇫🇷" },
  { name: "Barcelona", slug: "barcelona", country: "Spain", flag: "🇪🇸" },
  { name: "Marrakech", slug: "marrakech", country: "Morocco", flag: "🇲🇦" },
  { name: "Bangkok", slug: "bangkok", country: "Thailand", flag: "🇹🇭" },
  { name: "Lisbon", slug: "lisbon", country: "Portugal", flag: "🇵🇹" },
  { name: "London", slug: "london", country: "UK", flag: "🇬🇧" },
  { name: "Istanbul", slug: "istanbul", country: "Turkey", flag: "🇹🇷" },
  { name: "Bali", slug: "bali", country: "Indonesia", flag: "🇮🇩" },
  { name: "Tokyo", slug: "tokyo", country: "Japan", flag: "🇯🇵" },
  { name: "Miami", slug: "miami", country: "USA", flag: "🇺🇸" },
  { name: "Cape Town", slug: "cape-town", country: "South Africa", flag: "🇿🇦" },
];

const PopularCities = () => {
  const { t } = useI18n();

  return (
    <section id="cities" className="py-16 sm:py-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            {t("landing.cities.title") || "Popular Cities"}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl mx-auto">
            {t("landing.cities.subtitle") || "Explore the most active cities on the platform"}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {CITIES.map((city, i) => (
            <motion.div key={city.slug} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
              <Link to={`/city/${city.slug}`} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 sm:p-4 hover:border-primary/40 hover:shadow-md transition-all group">
                <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">{city.flag}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{city.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>{city.country}</span>
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/explore" className="text-sm font-medium text-accent hover:underline">
            {t("landing.cities.explore_all") || "Explore all cities →"}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PopularCities;
