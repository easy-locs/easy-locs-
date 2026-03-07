import { motion } from "framer-motion";
import {
  Home, MessageSquare, FileSignature, CreditCard,
  CalendarRange, Concierge, FileText, BrainCircuit,
} from "lucide-react";

const features = [
  { icon: Home, title: "Property Management", desc: "Track all your properties, units, and buildings across countries with real-time dashboards." },
  { icon: MessageSquare, title: "Tenant Communication", desc: "Built-in messaging hub with auto-translation in 31 languages between landlords and tenants." },
  { icon: FileSignature, title: "Digital Contracts", desc: "Generate country-specific lease agreements with electronic signature support." },
  { icon: CreditCard, title: "Online Rent Payments", desc: "Collect rent via Stripe, SEPA, Apple Pay and Google Pay with automated receipts." },
  { icon: CalendarRange, title: "Short-term Rental", desc: "Calendar management, booking engine, and OTA sync with Airbnb, Booking & VRBO." },
  { icon: Concierge, title: "Concierge Services", desc: "Offer cleaning, transfers, activities and extras to guests through your booking portal." },
  { icon: FileText, title: "Automated Documents", desc: "Auto-generate receipts, payment notices, dunning letters and fiscal reports by country." },
  { icon: BrainCircuit, title: "AI Automation Tools", desc: "AI assistant for document generation, rent optimization, and tenant communication." },
];

const Features = () => {
  return (
    <section id="features" className="py-20 sm:py-28 bg-muted/30">
      <div className="container max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Everything You Need to <span className="text-gradient-gold">Manage & Grow</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            A complete suite of tools for property owners, managers, and concierge professionals.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group bg-card rounded-xl p-6 border border-border/50 hover:border-accent/30 hover:shadow-card-hover transition-all"
            >
              <div className="w-11 h-11 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <f.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-2">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
