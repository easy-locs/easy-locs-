/**
 * ServicesSection — Services marketplace showcase.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Wrench, Star, MapPin, CheckCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const SERVICES = [
  { title: "Home Cleaning", emoji: "🧹", rating: 4.9, pros: 234, to: "/marketplace/cleaning" },
  { title: "Plumbing", emoji: "🔧", rating: 4.8, pros: 156, to: "/marketplace/maintenance" },
  { title: "Electrician", emoji: "⚡", rating: 4.7, pros: 189, to: "/marketplace/maintenance" },
  { title: "Car Rental", emoji: "🚗", rating: 4.8, pros: 312, to: "/marketplace/car-rental" },
  { title: "Moving", emoji: "📦", rating: 4.6, pros: 98, to: "/marketplace/moving" },
  { title: "Concierge", emoji: "🔑", rating: 4.9, pros: 76, to: "/marketplace/concierge" },
  { title: "Beauty & Spa", emoji: "💅", rating: 4.8, pros: 215, to: "/marketplace/beauty" },
  { title: "Pet Care", emoji: "🐾", rating: 4.7, pros: 64, to: "/marketplace/pet-care" },
];

export default function ServicesSection() {
  const { t } = useI18n();
  return (
    <section className="py-10 sm:py-14 bg-muted/30" aria-label="Services Marketplace">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className="flex items-center justify-between mb-5"
        >
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Wrench className="h-5 w-5" style={{ color: "hsl(220 70% 55%)" }} />
              {t("landing.services.title") || "Services Marketplace"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {t("landing.services.subtitle") || "Trusted professionals · Instant booking"}
            </p>
          </div>
          <Link
            to="/services-hub"
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-accent hover:gap-2 transition-all"
          >
            {t("landing.services.browse") || "All services"} <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SERVICES.map((svc, i) => (
            <motion.div
              key={svc.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={svc.to}
                className="group flex flex-col gap-3 p-4 rounded-2xl border border-border/30 bg-card hover:shadow-lg hover:border-accent/30 transition-all duration-300"
              >
                <span className="text-3xl">{svc.emoji}</span>
                <div>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                    {svc.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    <span className="text-xs font-semibold text-foreground">{svc.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {svc.pros}+ verified pros
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-accent mt-auto">
                  Book now →
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
