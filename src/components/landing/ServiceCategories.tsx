import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Home, Sparkles, Wrench, KeyRound, Car, Truck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const CATEGORIES = [
  { labelKey: "landing.svccat.real_estate", icon: Building2, slug: "real-estate" },
  { labelKey: "landing.svccat.property_mgmt", icon: Home, slug: "property-management" },
  { labelKey: "landing.svccat.cleaning", icon: Sparkles, slug: "cleaning" },
  { labelKey: "landing.svccat.maintenance", icon: Wrench, slug: "maintenance" },
  { labelKey: "landing.svccat.concierge", icon: KeyRound, slug: "concierge" },
  { labelKey: "landing.svccat.car_rental", icon: Car, slug: "car-rental" },
  { labelKey: "landing.svccat.moving", icon: Truck, slug: "moving" },
];

const ServiceCategories = () => {
  const { t } = useI18n();

  return (
    <section id="categories" className="py-16 sm:py-20 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{t("landing.svccat.title") || "Service Categories"}</h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl mx-auto">
            {t("landing.svccat.subtitle") || "Find trusted professionals across every category"}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {CATEGORIES.map((cat, i) => (
            <motion.div key={cat.slug} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
              <Link to={`/marketplace/${cat.slug}`} className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card p-5 sm:p-6 hover:border-accent/50 hover:shadow-md transition-all group text-center">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <cat.icon className="h-5 w-5 text-accent" />
                </div>
                <span className="text-sm font-semibold text-foreground leading-tight">{t(cat.labelKey)}</span>
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link to="/marketplace" className="text-sm font-medium text-accent hover:underline">
            {t("landing.svccat.browse_all") || "Browse all services →"}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ServiceCategories;
