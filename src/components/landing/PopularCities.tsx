import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

const CITIES = [
  { name: "Dubai", slug: "dubai", country: "UAE", flag: "🇦🇪" },
  { name: "Paris", slug: "paris", country: "France", flag: "🇫🇷" },
  { name: "Marrakech", slug: "marrakech", country: "Morocco", flag: "🇲🇦" },
  { name: "Bangkok", slug: "bangkok", country: "Thailand", flag: "🇹🇭" },
  { name: "Barcelona", slug: "barcelona", country: "Spain", flag: "🇪🇸" },
  { name: "Lisbon", slug: "lisbon", country: "Portugal", flag: "🇵🇹" },
  { name: "London", slug: "london", country: "UK", flag: "🇬🇧" },
  { name: "Istanbul", slug: "istanbul", country: "Turkey", flag: "🇹🇷" },
];

const PopularCities = () => (
  <section className="py-16 sm:py-20 px-4 bg-muted/30">
    <div className="container mx-auto max-w-6xl">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Popular Cities</h2>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl mx-auto">
          Explore the most active cities on the platform
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {CITIES.map((city, i) => (
          <motion.div
            key={city.slug}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              to={`/city/${city.slug}`}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 sm:p-4 hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <span className="text-2xl">{city.flag}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{city.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {city.country}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default PopularCities;
