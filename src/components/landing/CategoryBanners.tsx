/**
 * CategoryBanners — Big visual category cards for the 5 main verticals.
 * Horizontal scroll on mobile, grid on desktop.
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
    sub: "Restaurants, grocery, bakery — delivered fast",
    icon: UtensilsCrossed,
    image: foodBanner,
    to: "/food",
    accent: "hsl(15 80% 55%)",
    cta: "Order Now",
  },
  {
    title: "Travel & Stays",
    sub: "Hotels, resorts, vacation rentals worldwide",
    icon: Plane,
    image: travelBanner,
    to: "/travel",
    accent: "hsl(200 70% 50%)",
    cta: "Book a Stay",
  },
  {
    title: "Transport & Rides",
    sub: "Taxi, VTC, car rental — instant pickup",
    icon: Car,
    image: transportBanner,
    to: "/ride",
    accent: "hsl(270 60% 55%)",
    cta: "Get a Ride",
  },
  {
    title: "Real Estate",
    sub: "Buy, sell, rent — property management",
    icon: Building2,
    image: realestateBanner,
    to: "/property-hub",
    accent: "hsl(38 65% 50%)",
    cta: "Explore Properties",
  },
  {
    title: "Services",
    sub: "Plumber, electrician, cleaning & more",
    icon: Wrench,
    image: servicesBanner,
    to: "/services-hub",
    accent: "hsl(220 70% 55%)",
    cta: "Find a Pro",
  },
];

export default function CategoryBanners() {
  return (
    <section className="py-10 sm:py-16 bg-background" aria-label="Main Categories">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className="text-center mb-6 sm:mb-10"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground">
            Everything You Need. <span className="text-accent">One App.</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-lg mx-auto">
            From food to real estate — explore all verticals
          </p>
        </motion.div>

        {/* Horizontal scroll on mobile, 2-col grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="snap-start shrink-0 w-[280px] sm:w-auto"
            >
              <Link
                to={cat.to}
                className="group relative block rounded-2xl overflow-hidden border border-border/20 hover:border-accent/40 transition-all duration-300 hover:shadow-xl"
              >
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    width={1280}
                    height={720}
                  />
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm"
                        style={{ background: `${cat.accent}30` }}
                      >
                        <cat.icon className="h-4 w-4" style={{ color: cat.accent }} />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white">{cat.title}</h3>
                    </div>
                    <p className="text-xs text-white/70 mb-3">{cat.sub}</p>
                    <span
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white backdrop-blur-sm group-hover:gap-2.5 transition-all"
                      style={{ background: `${cat.accent}90` }}
                    >
                      {cat.cta} <ArrowRight className="h-3.5 w-3.5" />
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
