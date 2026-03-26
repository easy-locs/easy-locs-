/**
 * FoodSection — Priority food vertical showcase with horizontal scroll cards.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Clock, UtensilsCrossed } from "lucide-react";
import { useHomeSections } from "@/hooks/useHomeSections";
import { useI18n } from "@/lib/i18n";

const FOOD_SUBCATS = [
  { label: "Pizza", emoji: "🍕", to: "/food?sub=pizza" },
  { label: "Sushi", emoji: "🍣", to: "/food?sub=sushi" },
  { label: "Burger", emoji: "🍔", to: "/food?sub=burger" },
  { label: "Shawarma", emoji: "🌯", to: "/food?sub=shawarma" },
  { label: "Coffee", emoji: "☕", to: "/food?sub=coffee" },
  { label: "Bakery", emoji: "🥐", to: "/food?sub=bakery" },
  { label: "Desserts", emoji: "🍰", to: "/food?sub=desserts" },
  { label: "Healthy", emoji: "🥗", to: "/food?sub=healthy" },
];

export default function FoodSection() {
  const { data } = useHomeSections();
  const { t } = useI18n();
  const shops = data?.bestRated ?? [];

  return (
    <section className="py-10 sm:py-14 bg-background" aria-label="Food Delivery">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className="flex items-center justify-between mb-4"
        >
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" style={{ color: "hsl(15 80% 55%)" }} />
              {t("landing.food.title") || "Food & Delivery"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {t("landing.food.subtitle") || "Best restaurants near you · Fast delivery"}
            </p>
          </div>
          <Link
            to="/food"
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-accent hover:gap-2 transition-all"
          >
            {t("landing.food.explore") || "Explore"} <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        {/* Subcategory pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none mb-4">
          {FOOD_SUBCATS.map((sub) => (
            <Link
              key={sub.label}
              to={sub.to}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/30 bg-card/60 hover:border-accent/40 hover:bg-accent/5 transition-all text-xs font-semibold text-foreground"
            >
              <span>{sub.emoji}</span>
              {sub.label}
            </Link>
          ))}
        </div>

        {/* Restaurant cards */}
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
          {shops.length === 0 && (
            <div className="w-full py-8 text-center">
              <UtensilsCrossed className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No restaurants available yet in your area</p>
            </div>
          )}

          {shops.map((shop, i) => (
            <motion.div
              key={shop.id}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="snap-start shrink-0 w-[240px]"
            >
              <Link
                to={`/s/${shop.slug}`}
                className="group block rounded-2xl border border-border/20 bg-card overflow-hidden hover:shadow-lg hover:border-accent/30 transition-all duration-300"
              >
                <div className="aspect-[16/10] bg-muted/20 relative overflow-hidden">
                  {(shop.banner_url || shop.logo_url) ? (
                    <img
                      src={shop.banner_url || shop.logo_url!}
                      alt={shop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-red-50 dark:from-orange-950/30 dark:to-red-950/20">
                      <UtensilsCrossed className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="text-sm font-bold text-foreground truncate group-hover:text-accent transition-colors">
                    {shop.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {shop.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                        <Star className="h-3 w-3 fill-amber-500" /> {Number(shop.rating).toFixed(1)}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> 15-25 min
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-accent">Order →</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
