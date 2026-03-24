/**
 * CategoryBanners — Premium category cards with glass overlay, live counters, depth.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, UtensilsCrossed, Plane, Car, Building2, Wrench } from "lucide-react";

import foodBanner from "@/assets/landing/food-banner.jpg";
import travelBanner from "@/assets/landing/travel-banner.jpg";
import transportBanner from "@/assets/landing/transport-banner.jpg";
import realestateBanner from "@/assets/landing/realestate-banner.jpg";
import servicesBanner from "@/assets/landing/services-banner.jpg";

const CATEGORIES = [
  {
    title: "Food & Delivery",
    sub: "Restaurants, grocery, bakery",
    icon: UtensilsCrossed,
    image: foodBanner,
    to: "/food",
    accent: "hsl(15 80% 55%)",
    cta: "Order Now",
    count: "3,200+ restaurants",
  },
  {
    title: "Travel & Stays",
    sub: "Hotels, resorts, vacation rentals",
    icon: Plane,
    image: travelBanner,
    to: "/travel",
    accent: "hsl(200 70% 50%)",
    cta: "Book a Stay",
    count: "1,800+ properties",
  },
  {
    title: "Transport",
    sub: "Taxi, VTC, car rental",
    icon: Car,
    image: transportBanner,
    to: "/ride",
    accent: "hsl(270 60% 55%)",
    cta: "Get a Ride",
    count: "500+ drivers",
  },
  {
    title: "Real Estate",
    sub: "Buy, sell, rent, manage",
    icon: Building2,
    image: realestateBanner,
    to: "/property-hub",
    accent: "hsl(38 65% 50%)",
    cta: "Explore",
    count: "10K+ listings",
  },
  {
    title: "Services",
    sub: "Plumber, electrician, cleaning",
    icon: Wrench,
    image: servicesBanner,
    to: "/services-hub",
    accent: "hsl(220 70% 55%)",
    cta: "Find a Pro",
    count: "2,100+ pros",
  },
];

export default function CategoryBanners() {
  return (
    <section className="py-10 sm:py-14 bg-background" aria-label="Main Categories">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className="text-center mb-6 sm:mb-8"
        >
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground">
            Everything You Need. <span className="text-accent">One App.</span>
          </h2>
        </motion.div>

        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0 sm:gap-4">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="snap-start shrink-0 w-[260px] sm:w-auto"
            >
              <Link
                to={cat.to}
                className="group relative block rounded-2xl overflow-hidden border border-border/10 hover:border-accent/30 transition-all duration-300 hover:shadow-xl hover:shadow-accent/5"
              >
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                    width={1280}
                    height={720}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Glass content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-md border border-white/10"
                        style={{ background: `${cat.accent}25` }}
                      >
                        <cat.icon className="h-3.5 w-3.5" style={{ color: cat.accent }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white leading-none">{cat.title}</h3>
                        <p className="text-[9px] text-white/50 mt-0.5">{cat.count}</p>
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-[10px] font-bold text-white backdrop-blur-md border border-white/10 group-hover:gap-2 transition-all"
                      style={{ background: `${cat.accent}80` }}
                    >
                      {cat.cta} <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
