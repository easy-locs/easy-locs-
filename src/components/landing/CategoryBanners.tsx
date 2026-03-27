/**
 * CategoryBanners — Premium first-class category cards with immersive glass overlays.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, UtensilsCrossed, Plane, Car, Building2, Wrench, ShoppingCart, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

import foodBanner from "@/assets/landing/food-banner.jpg";
import travelBanner from "@/assets/landing/travel-banner.jpg";
import transportBanner from "@/assets/landing/transport-banner.jpg";
import realestateBanner from "@/assets/landing/realestate-banner.jpg";
import servicesBanner from "@/assets/landing/services-banner.jpg";

export default function CategoryBanners() {
  const { t } = useI18n();

  const CATEGORIES = [
    {
      title: t("landing.catban.food") || "Food & Delivery",
      sub: t("landing.catban.food_sub") || "Restaurants, grocery, bakery — delivered fast",
      icon: UtensilsCrossed, image: foodBanner, to: "/food",
      accent: "hsl(15 80% 55%)",
      cta: t("landing.catban.food_cta") || "Order Now",
      count: "3,200+", countLabel: t("landing.catban.restaurants") || "restaurants",
      badge: "🔥 Popular",
    },
    {
      title: t("landing.catban.travel") || "Travel & Stays",
      sub: t("landing.catban.travel_sub") || "Hotels, resorts, vacation rentals worldwide",
      icon: Plane, image: travelBanner, to: "/travel",
      accent: "hsl(200 70% 50%)",
      cta: t("landing.catban.travel_cta") || "Book a Stay",
      count: "1,800+", countLabel: t("landing.catban.properties") || "properties",
      badge: null,
    },
    {
      title: t("landing.catban.transport") || "Transport",
      sub: t("landing.catban.transport_sub") || "Taxi, VTC, car rental — instant booking",
      icon: Car, image: transportBanner, to: "/mobility/taxi",
      accent: "hsl(270 60% 55%)",
      cta: t("landing.catban.transport_cta") || "Get a Ride",
      count: "500+", countLabel: t("landing.catban.drivers") || "drivers",
      badge: "⚡ Fast",
    },
    {
      title: t("landing.catban.realestate") || "Real Estate",
      sub: t("landing.catban.realestate_sub") || "Buy, sell, rent, manage — 190+ countries",
      icon: Building2, image: realestateBanner, to: "/property-hub",
      accent: "hsl(38 65% 50%)",
      cta: t("landing.catban.realestate_cta") || "Explore",
      count: "10K+", countLabel: t("landing.catban.listings") || "listings",
      badge: null,
    },
    {
      title: t("landing.catban.services") || "Services",
      sub: t("landing.catban.services_sub") || "Plumber, electrician, cleaning — nearby pros",
      icon: Wrench, image: servicesBanner, to: "/services-hub",
      accent: "hsl(220 70% 55%)",
      cta: t("landing.catban.services_cta") || "Find a Pro",
      count: "2,100+", countLabel: t("landing.catban.professionals") || "professionals",
      badge: t("landing.catban.nearby") || "Nearby",
    },
  ];

  return (
    <section className="py-8 sm:py-16 bg-background" aria-label="Main Categories">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className="text-center mb-8 sm:mb-10"
        >
          <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full border border-accent/20" style={{ background: "hsl(var(--accent) / 0.05)" }}>
            <Sparkles className="w-3 h-3 text-accent" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">{t("landing.catban.badge") || "Explore"}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground">
            {t("landing.catban.title") || "Everything You Need."} <span className="text-accent">{t("landing.catban.title_hl") || "One App."}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {t("landing.catban.subtitle") || "Discover, order, book, and manage — all from a single platform."}
          </p>
        </motion.div>

        {/* Featured banner */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-4">
          {(() => {
            const featured = CATEGORIES[0];
            const FeaturedIcon = featured.icon;
            return (
              <Link to={featured.to} className="group relative block rounded-3xl overflow-hidden border border-border/10 hover:border-accent/30 transition-all duration-300" style={{ boxShadow: "0 8px 40px hsl(0 0% 0% / 0.15)" }}>
                <div className="aspect-[21/9] sm:aspect-[3/1] relative overflow-hidden">
                  <img src={featured.image} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="eager" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(0 0% 0% / 0.6) 0%, hsl(0 0% 0% / 0.2) 50%, hsl(0 0% 0% / 0.5) 100%)" }} />
                  {featured.badge && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold text-white backdrop-blur-md" style={{ background: `${featured.accent}80`, border: `1px solid ${featured.accent}40` }}>
                      {featured.badge}
                    </span>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/15" style={{ background: `${featured.accent}30` }}>
                            <FeaturedIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-white">{featured.title}</h3>
                            <p className="text-[10px] sm:text-xs text-white/60">{featured.sub}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white/80 text-xs font-semibold">
                            <span className="text-white font-extrabold">{featured.count}</span> {featured.countLabel}
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white backdrop-blur-md border border-white/10 group-hover:gap-2.5 transition-all shrink-0" style={{ background: `${featured.accent}90` }}>
                        {featured.cta} <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })()}
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {CATEGORIES.slice(1).map((cat, i) => (
            <motion.div key={cat.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }} transition={{ delay: i * 0.06, duration: 0.4 }}>
              <Link to={cat.to} className="group relative block rounded-2xl overflow-hidden border border-border/10 hover:border-accent/30 transition-all duration-300 hover:shadow-xl hover:shadow-accent/5">
                <div className="aspect-[4/5] sm:aspect-[3/4] relative overflow-hidden">
                  <img src={cat.image} alt={cat.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" width={640} height={800} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  {cat.badge && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-bold text-white backdrop-blur-md" style={{ background: `${cat.accent}70`, border: `1px solid ${cat.accent}30` }}>
                      {cat.badge}
                    </span>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-md border border-white/10" style={{ background: `${cat.accent}25` }}>
                        <cat.icon className="h-3.5 w-3.5" style={{ color: cat.accent }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-white leading-tight line-clamp-2">{cat.title}</h3>
                        <p className="text-[8px] sm:text-[9px] text-white/50 line-clamp-1">{cat.count} {cat.countLabel}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-bold text-white backdrop-blur-md border border-white/10 group-hover:gap-1.5 transition-all" style={{ background: `${cat.accent}80` }}>
                      {cat.cta} <ArrowRight className="h-2.5 w-2.5" />
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
