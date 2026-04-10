/**
 * ForYouSection — Personalized recommendations (future-ready).
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, User, Sparkles, Heart } from "lucide-react";
import { useHomeSections } from "@/hooks/useHomeSections";
import { useI18n } from "@/lib/i18n";

export default function ForYouSection() {
  const { data } = useHomeSections();
  const { t } = useI18n();
  const shops = data?.nearYou ?? data?.newest ?? [];

  if (shops.length === 0) return null;

  return (
    <section className="py-10 sm:py-14 bg-muted/20" aria-label={t("landing.foryou.title") || "For You"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className="flex items-center justify-between mb-5"
        >
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              {t("landing.foryou.title") || "For You"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {t("landing.foryou.subtitle") || "Personalized picks based on your preferences"}
            </p>
          </div>
        </motion.div>

        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
          {shops.slice(0, 8).map((shop, i) => (
            <motion.div
              key={shop.id}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="snap-start shrink-0 w-[180px]"
            >
              <Link
                to={`/s/${shop.slug}`}
                className="group block rounded-2xl border border-border/20 bg-card overflow-hidden hover:shadow-lg hover:border-accent/30 transition-all duration-300"
              >
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  {(shop.banner_url || shop.logo_url) ? (
                    <img
                      src={shop.banner_url || shop.logo_url!}
                      alt={shop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                   <p className="text-xs font-bold text-foreground break-words leading-snug">{shop.name}</p>
                   <p className="text-[10px] text-muted-foreground break-words leading-snug mt-0.5">
                     {shop.vertical || shop.address || t("landing.foryou.recommended") || "Recommended"}
                   </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-6"
        >
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-accent/20 bg-accent/5 text-sm font-semibold text-accent hover:bg-accent/10 transition-all"
          >
            <User className="h-4 w-4" />
            {t("landing.foryou.cta") || "Sign up for personalized recommendations"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
