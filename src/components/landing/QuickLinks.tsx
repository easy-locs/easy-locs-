import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Store, Sun, CalendarCheck, LayoutDashboard, CreditCard, Briefcase } from "lucide-react";

const LINKS = [
  { label: "Add Property", icon: Plus, to: "/dashboard/add-property", accent: true },
  { label: "Add Service", icon: Briefcase, to: "/dashboard/activities" },
  { label: "Marketplace", icon: Store, to: "/explore" },
  { label: "Seasonal Rentals", icon: Sun, to: "/dashboard/seasonal" },
  { label: "Bookings", icon: CalendarCheck, to: "/dashboard/operations" },
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Pricing", icon: CreditCard, to: "/#pricing" },
];

const QuickLinks = () => (
  <section className="py-14 sm:py-16 px-4 bg-muted/30">
    <div className="container mx-auto max-w-5xl">
      <div className="text-center mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Quick Access</h2>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
        {LINKS.map((link, i) => (
          <motion.div
            key={link.to}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.03 }}
          >
            <Link
              to={link.to}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium border transition-all hover:shadow-sm ${
                link.accent
                  ? "bg-accent text-accent-foreground border-accent/60 hover:bg-accent/90"
                  : "bg-card text-foreground border-border/60 hover:border-primary/40"
              }`}
            >
              <link.icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default QuickLinks;
