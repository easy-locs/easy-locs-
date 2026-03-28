/**
 * TravelSection — Travel & rentals showcase with premium cards.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Plane, MapPin, Star, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import travelBanner from "@/assets/landing/travel-banner.jpg";

const TRAVEL_CARDS = [
  { title: "Dubai Marina Apartment", location: "Dubai, UAE", price: "$89/night", rating: 4.8, image: travelBanner, type: "Hotel" },
  { title: "Bali Villa Resort", location: "Bali, Indonesia", price: "$120/night", rating: 4.9, type: "Resort" },
  { title: "Paris Studio Central", location: "Paris, France", price: "$75/night", rating: 4.6, type: "Apartment" },
  { title: "Tokyo Business Suite", location: "Tokyo, Japan", price: "$95/night", rating: 4.7, type: "Suite" },
  { title: "Dakar Ocean View", location: "Dakar, Senegal", price: "$55/night", rating: 4.5, type: "Villa" },
];

export default function TravelSection() {
  const { t } = useI18n();
  return (
    <section className="py-10 sm:py-14 bg-background" aria-label="Travel & Stays">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className="flex items-center justify-between mb-5"
        >
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Plane className="h-5 w-5" style={{ color: "hsl(200 70% 50%)" }} />
              {t("landing.travel.title") || "Travel & Stays"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {t("landing.travel.subtitle") || "Book directly · No commission · Worldwide"}
            </p>
          </div>
          <Link
            to="/travel"
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-accent hover:gap-2 transition-all"
          >
            {t("landing.travel.browse") || "Browse all"} <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
          {TRAVEL_CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="snap-start shrink-0 w-[260px]"
            >
              <Link
                to="/travel"
                className="group block rounded-2xl border border-border/20 bg-card overflow-hidden hover:shadow-lg hover:border-accent/30 transition-all duration-300"
              >
                <div className="aspect-[16/10] relative overflow-hidden bg-gradient-to-br from-sky-100 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/20">
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Plane className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-accent/90 text-accent-foreground text-[9px] font-bold">
                    {card.type}
                  </span>
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="text-sm font-bold text-foreground line-clamp-2 break-words leading-snug group-hover:text-accent transition-colors">
                    {card.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="line-clamp-2 break-words leading-snug">{card.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-foreground">{card.price}</span>
                    <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                      <Star className="h-3 w-3 fill-amber-500" /> {card.rating}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-accent flex items-center gap-0.5">
                    <Calendar className="h-3 w-3" /> Book now →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
