import { motion } from "framer-motion";
import {
  Home, MessageSquare, FileSignature, CreditCard,
  CalendarRange, ConciergeBell, FileText, BrainCircuit,
} from "lucide-react";

const features = [
  { icon: Home, title: "Property Management", desc: "Track all your properties, units, and buildings across countries with real-time dashboards.", accent: "accent" },
  { icon: MessageSquare, title: "Tenant Communication", desc: "Built-in messaging hub with auto-translation in 31 languages between landlords and tenants.", accent: "info" },
  { icon: FileSignature, title: "Digital Contracts", desc: "Generate country-specific lease agreements with electronic signature support.", accent: "success" },
  { icon: CreditCard, title: "Online Rent Payments", desc: "Collect rent via Stripe, SEPA, Apple Pay and Google Pay with automated receipts.", accent: "warning" },
  { icon: CalendarRange, title: "Short-term Rental", desc: "Calendar management, booking engine, and OTA sync with Airbnb, Booking & VRBO.", accent: "accent" },
  { icon: ConciergeBell, title: "Concierge Services", desc: "Offer cleaning, transfers, activities and extras to guests through your booking portal.", accent: "info" },
  { icon: FileText, title: "Automated Documents", desc: "Auto-generate receipts, payment notices, dunning letters and fiscal reports by country.", accent: "success" },
  { icon: BrainCircuit, title: "AI Automation Tools", desc: "AI assistant for document generation, rent optimization, and tenant communication.", accent: "warning" },
];

const Features = () => {
  return (
    <section id="features" className="py-24 sm:py-32 relative overflow-hidden">
      {/* Subtle background grid */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }} />

      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5"
          >
            Features
          </motion.span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4">
            Everything You Need to{" "}
            <span className="text-gradient-gold">Manage & Grow</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            A complete suite of tools for property owners, managers, and concierge professionals.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group relative bg-card rounded-2xl p-6 border border-border/50 hover:border-accent/30 transition-all duration-300 overflow-hidden"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{ background: `radial-gradient(circle at 50% 0%, hsl(var(--${f.accent}) / 0.08) 0%, transparent 70%)` }}
              />
              
              <div className="relative z-10">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: `hsl(var(--${f.accent}) / 0.1)`,
                    boxShadow: `0 0 0 0 hsl(var(--${f.accent}) / 0)`,
                  }}
                >
                  <f.icon className="h-5 w-5" style={{ color: `hsl(var(--${f.accent}))` }} />
                </div>
                <h3 className="font-bold text-foreground text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
