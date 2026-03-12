import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";

const CONTINENTS = [
  {
    name: "Europe",
    emoji: "🌍",
    countries: [
      { name: "Croatia", slug: "croatia", flag: "🇭🇷", cities: ["Dubrovnik", "Split"] },
      { name: "France", slug: "france", flag: "🇫🇷", cities: ["Paris", "Lyon", "Nice", "Marseille"] },
      { name: "Germany", slug: "germany", flag: "🇩🇪", cities: ["Berlin", "Munich"] },
      { name: "Greece", slug: "greece", flag: "🇬🇷", cities: ["Athens", "Thessaloniki"] },
      { name: "Italy", slug: "italy", flag: "🇮🇹", cities: ["Rome", "Milan", "Florence"] },
      { name: "Netherlands", slug: "netherlands", flag: "🇳🇱", cities: ["Amsterdam"] },
      { name: "Portugal", slug: "portugal", flag: "🇵🇹", cities: ["Lisbon", "Porto"] },
      { name: "Spain", slug: "spain", flag: "🇪🇸", cities: ["Barcelona", "Madrid", "Malaga"] },
      { name: "Switzerland", slug: "switzerland", flag: "🇨🇭", cities: ["Zurich", "Geneva"] },
      { name: "UK", slug: "united-kingdom", flag: "🇬🇧", cities: ["London", "Manchester"] },
    ],
  },
  {
    name: "Middle East",
    emoji: "🏜️",
    countries: [
      { name: "Qatar", slug: "qatar", flag: "🇶🇦", cities: ["Doha"] },
      { name: "Saudi Arabia", slug: "saudi-arabia", flag: "🇸🇦", cities: ["Riyadh", "Jeddah"] },
      { name: "Turkey", slug: "turkey", flag: "🇹🇷", cities: ["Istanbul", "Antalya"] },
      { name: "UAE", slug: "uae", flag: "🇦🇪", cities: ["Dubai", "Abu Dhabi"] },
    ],
  },
  {
    name: "Africa",
    emoji: "🌍",
    countries: [
      { name: "Egypt", slug: "egypt", flag: "🇪🇬", cities: ["Cairo", "Hurghada"] },
      { name: "Mauritius", slug: "mauritius", flag: "🇲🇺", cities: ["Port Louis"] },
      { name: "Morocco", slug: "morocco", flag: "🇲🇦", cities: ["Marrakech", "Casablanca"] },
      { name: "Senegal", slug: "senegal", flag: "🇸🇳", cities: ["Dakar"] },
      { name: "South Africa", slug: "south-africa", flag: "🇿🇦", cities: ["Cape Town", "Johannesburg"] },
      { name: "Tunisia", slug: "tunisia", flag: "🇹🇳", cities: ["Tunis"] },
    ],
  },
  {
    name: "Asia & Pacific",
    emoji: "🌏",
    countries: [
      { name: "Thailand", slug: "thailand", flag: "🇹🇭", cities: ["Bangkok", "Phuket", "Chiang Mai"] },
      { name: "Japan", slug: "japan", flag: "🇯🇵", cities: ["Tokyo", "Osaka"] },
      { name: "Indonesia", slug: "indonesia", flag: "🇮🇩", cities: ["Bali", "Jakarta"] },
      { name: "Vietnam", slug: "vietnam", flag: "🇻🇳", cities: ["Ho Chi Minh", "Hanoi"] },
      { name: "South Korea", slug: "south-korea", flag: "🇰🇷", cities: ["Seoul", "Busan"] },
      { name: "Malaysia", slug: "malaysia", flag: "🇲🇾", cities: ["Kuala Lumpur"] },
    ],
  },
  {
    name: "Americas",
    emoji: "🌎",
    countries: [
      { name: "USA", slug: "usa", flag: "🇺🇸", cities: ["Miami", "New York", "Los Angeles"] },
      { name: "Mexico", slug: "mexico", flag: "🇲🇽", cities: ["Mexico City", "Cancún"] },
      { name: "Brazil", slug: "brazil", flag: "🇧🇷", cities: ["São Paulo", "Rio"] },
      { name: "Colombia", slug: "colombia", flag: "🇨🇴", cities: ["Bogotá", "Medellín"] },
      { name: "Canada", slug: "canada", flag: "🇨🇦", cities: ["Toronto", "Montreal"] },
    ],
  },
];

const BrowseByCountry = () => (
  <section id="countries" className="py-16 sm:py-24 px-4 bg-background">
    <div className="container mx-auto max-w-6xl">
      {/* Header */}
      <div className="text-center mb-10 sm:mb-14">
        <motion.span
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-4"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Globe className="h-3.5 w-3.5" />
          110+ Countries
        </motion.span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
          Browse by Country
        </h2>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl mx-auto">
          Discover properties and services across every continent
        </p>
      </div>

      {/* Continent blocks */}
      <div className="space-y-10 sm:space-y-12">
        {CONTINENTS.map((continent) => (
          <motion.div
            key={continent.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground mb-4 flex items-center gap-2">
              <span>{continent.emoji}</span>
              {continent.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {continent.countries.map((c) => (
                <div
                  key={c.slug}
                  className="rounded-xl border border-border/60 bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <Link
                    to={`/country/${c.slug}`}
                    className="flex items-center gap-3 group"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform shrink-0">
                      {c.flag}
                    </span>
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {c.name}
                    </span>
                  </Link>
                  {c.cities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 ml-10">
                      {c.cities.map((city) => (
                        <Link
                          key={city}
                          to={`/city/${city.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-[11px] sm:text-xs text-muted-foreground hover:text-accent transition-colors px-2 py-0.5 rounded-md bg-muted/50 hover:bg-accent/10"
                        >
                          {city}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-10">
        <Link
          to="/locations"
          className="text-sm font-medium text-accent hover:underline"
        >
          View all 110+ countries →
        </Link>
      </div>
    </div>
  </section>
);

export default BrowseByCountry;
