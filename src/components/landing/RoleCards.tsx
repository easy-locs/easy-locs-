import { motion } from "framer-motion";
import {
  Building2, Send, Store, ArrowRight,
  Home, Users, FileSignature, CreditCard, BarChart3,
  CalendarRange, Link2, Smartphone,
  Brush, Car, MapPin, Sparkles, Globe,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const RoleCards = () => {
  const { user } = useAuth();

  const pillars = [
    {
      icon: Building2,
      title: "Long-Term Property Management",
      description: "Professional tools for landlords and property agencies worldwide.",
      features: [
        { icon: Home, label: "Multi-property dashboard" },
        { icon: FileSignature, label: "Lease generation & e-signature" },
        { icon: CreditCard, label: "Rent collection & receipts" },
        { icon: Users, label: "Tenant portal & communication" },
        { icon: BarChart3, label: "Financial reports & accounting" },
      ],
      cta: "Manage Properties",
      to: user ? "/dashboard" : "/long-term-rentals",
      color: "accent",
    },
    {
      icon: Send,
      title: "Direct Short-Term Booking",
      description: "Send booking links directly to guests. Accept payments without intermediaries.",
      features: [
        { icon: CalendarRange, label: "Smart booking calendar" },
        { icon: Link2, label: "Shareable booking links" },
        { icon: CreditCard, label: "Direct Stripe payments" },
        { icon: Smartphone, label: "Guest self-service portal" },
        { icon: Globe, label: "Multi-currency pricing" },
      ],
      cta: "Start Booking",
      to: user ? "/dashboard/seasonal" : "/seasonal-rentals",
      color: "info",
    },
    {
      icon: Store,
      title: "Global Service Marketplace",
      description: "Create and manage service businesses remotely in any city worldwide.",
      features: [
        { icon: Brush, label: "Cleaning & maintenance" },
        { icon: Car, label: "Car rental & transfers" },
        { icon: Sparkles, label: "Activities & experiences" },
        { icon: MapPin, label: "Multi-city operations" },
        { icon: CreditCard, label: "Online payments & invoicing" },
      ],
      cta: "Create Your Business",
      to: user ? "/dashboard/marketplace" : "/marketplace-services",
      color: "success",
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-background relative overflow-hidden">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
        backgroundSize: "40px 40px",
      }} />

      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-16 space-y-4"
        >
          <motion.span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5"
            whileHover={{ scale: 1.05 }}
          >
            Three Business Models
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            One Platform,{" "}
            <span className="text-gradient-gold">Three Ways to Grow</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Whether you manage rental properties, accept direct bookings, or run service businesses — Easy-Locs gives you the tools to operate globally.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 200 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <div
                className="flex flex-col h-full rounded-2xl border p-7 transition-all duration-300 relative overflow-hidden group"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--${pillar.color}) / 0.06) 0%, hsl(var(--${pillar.color}) / 0.01) 100%)`,
                  borderColor: `hsl(var(--${pillar.color}) / 0.12)`,
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {/* Top accent line with animation */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: `linear-gradient(90deg, hsl(var(--${pillar.color})), hsl(var(--${pillar.color}) / 0.2))` }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                />

                {/* Hover glow */}
                <div
                  className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-25 transition-opacity duration-500"
                  style={{ background: `hsl(var(--${pillar.color}))` }}
                />

                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-2">
                  <motion.div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `hsl(var(--${pillar.color}) / 0.1)` }}
                    whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <pillar.icon className="h-6 w-6" style={{ color: `hsl(var(--${pillar.color}))` }} />
                  </motion.div>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">{pillar.title}</h3>
                <p className="text-xs text-muted-foreground mb-4">{pillar.description}</p>

                {/* Divider */}
                <div className="w-full h-px mb-4" style={{ background: `hsl(var(--${pillar.color}) / 0.1)` }} />

                {/* Feature list with stagger */}
                <ul className="space-y-3 mb-6 flex-1">
                  {pillar.features.map((f, fi) => (
                    <motion.li
                      key={f.label}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + fi * 0.05 }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `hsl(var(--${pillar.color}) / 0.06)` }}
                      >
                        <f.icon className="h-3.5 w-3.5" style={{ color: `hsl(var(--${pillar.color}) / 0.7)` }} />
                      </div>
                      <span className="text-sm text-foreground/80">{f.label}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* CTA */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to={pillar.to}
                    className="group/btn inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: `hsl(var(--${pillar.color}) / 0.1)`,
                      color: `hsl(var(--${pillar.color}))`,
                      border: `1px solid hsl(var(--${pillar.color}) / 0.2)`,
                    }}
                  >
                    {pillar.cta}
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoleCards;
