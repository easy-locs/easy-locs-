import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Home, Sparkles, Wrench, KeyRound, Car, Truck } from "lucide-react";

const CATEGORIES = [
  { label: "Real Estate Services", icon: Building2, slug: "real-estate" },
  { label: "Property Management", icon: Home, slug: "property-management" },
  { label: "Cleaning", icon: Sparkles, slug: "cleaning" },
  { label: "Maintenance", icon: Wrench, slug: "maintenance" },
  { label: "Concierge", icon: KeyRound, slug: "concierge" },
  { label: "Car Rental", icon: Car, slug: "car-rental" },
  { label: "Moving Services", icon: Truck, slug: "moving" },
];

const ServiceCategories = () => (
  <section id="categories" className="py-16 sm:py-20 px-4 bg-background">
    <div className="container mx-auto max-w-6xl">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Service Categories</h2>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl mx-auto">
          Find trusted professionals across every category
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {CATEGORIES.map((cat, i) => (
          <motion.div
            key={cat.slug}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              to={`/marketplace/${cat.slug}`}
              className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card p-5 sm:p-6 hover:border-accent/50 hover:shadow-md transition-all group text-center"
            >
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <cat.icon className="h-5 w-5 text-accent" />
              </div>
              <span className="text-sm font-semibold text-foreground leading-tight">{cat.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ServiceCategories;
