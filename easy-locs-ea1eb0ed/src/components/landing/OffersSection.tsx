/**
 * OffersSection — Seasonal banners, events, and promotional offers.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Gift, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function OffersSection() {
  const { t } = useI18n();

  const OFFERS = [
    {
      title: t("landing.offers.summer") || "Summer Sale — Up to 40% Off",
      sub: t("landing.offers.summer_sub") || "Hotels & stays worldwide",
      gradient: "linear-gradient(135deg, hsl(200 80% 45%) 0%, hsl(220 70% 35%) 100%)",
      emoji: "☀️",
      cta: t("landing.offers.book") || "Book now",
      to: "/travel",
    },
    {
      title: t("landing.offers.delivery") || "Free Delivery Weekend",
      sub: t("landing.offers.delivery_sub") || "All food orders over $15",
      gradient: "linear-gradient(135deg, hsl(15 80% 50%) 0%, hsl(25 85% 40%) 100%)",
      emoji: "🍕",
      cta: t("landing.offers.order") || "Order now",
      to: "/food",
    },
    {
      title: t("landing.offers.pro") || "New Pro? Get 3 Months Free",
      sub: t("landing.offers.pro_sub") || "Launch your business on Easy-Locs",
      gradient: "linear-gradient(135deg, hsl(152 60% 35%) 0%, hsl(170 50% 28%) 100%)",
      emoji: "🚀",
      cta: t("landing.offers.start") || "Start free",
      to: "/signup",
    },
  ];

  return (
    <section className="py-10 sm:py-14 bg-background" aria-label={t("landing.offers.aria") || "Offers & Events"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center justify-center gap-2">
            <Gift className="h-5 w-5 text-accent" />
            {t("landing.offers.title") || "Offers & Events"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t("landing.offers.subtitle") || "Exclusive deals you don't want to miss"}
          </p>
        </motion.div>

        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
          {OFFERS.map((offer, i) => (
            <motion.div key={offer.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="snap-start shrink-0 w-[280px] sm:w-auto">
              <Link to={offer.to} className="group block rounded-2xl p-5 sm:p-6 relative overflow-hidden hover:shadow-xl transition-all duration-300" style={{ background: offer.gradient }}>
                <div className="relative z-10">
                  <span className="text-3xl mb-3 block">{offer.emoji}</span>
                  <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight mb-1">{offer.title}</h3>
                  <p className="text-xs text-white/70 mb-4">{offer.sub}</p>
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-white text-xs font-bold group-hover:gap-2.5 transition-all">
                    {offer.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
                  <Sparkles className="w-full h-full text-white" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
