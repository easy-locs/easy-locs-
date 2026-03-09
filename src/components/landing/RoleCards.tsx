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
      gradient: "linear-gradient(135deg, hsl(var(--accent) / 0.06) 0%, hsl(var(--accent) / 0.02) 100%)",
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
      gradient: "linear-gradient(135deg, hsl(var(--info) / 0.06) 0%, hsl(var(--info) / 0.02) 100%)",
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
      gradient: "linear-gradient(135deg, hsl(var(--success) / 0.06) 0%, hsl(var(--success) / 0.02) 100%)",
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-background relative overflow-hidden">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.012]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
        backgroundSize: "40px 40px",
      }} />

      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5">
            Three Business Models
          </span>
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
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6 }}
            >
              <div
                className="flex flex-col h-full rounded-2xl border p-7 transition-all duration-300 relative overflow-hidden group"
                style={{
                  background: pillar.gradient,
                  borderColor: `hsl(var(--${pillar.color}) / 0.12)`,
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: `linear-gradient(90deg, hsl(var(--${pillar.color})), hsl(var(--${pillar.color}) / 0.2))` }}
                />

                {/* Hover glow */}
                <div
                  className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                  style={{ background: `hsl(var(--${pillar.color}))` }}
                />

                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `hsl(var(--${pillar.color}) / 0.1)` }}
                  >
                    <pillar.icon className="h-6 w-6" style={{ color: `hsl(var(--${pillar.color}))` }} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">{pillar.title}</h3>
                <p className="text-xs text-muted-foreground mb-4">{pillar.description}</p>

                {/* Divider */}
                <div className="w-full h-px mb-4" style={{ background: `hsl(var(--${pillar.color}) / 0.1)` }} />

                {/* Feature list */}
                <ul className="space-y-3 mb-6 flex-1">
                  {pillar.features.map((f) => (
                    <li key={f.label} className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `hsl(var(--${pillar.color}) / 0.06)` }}
                      >
                        <f.icon className="h-3.5 w-3.5" style={{ color: `hsl(var(--${pillar.color}) / 0.7)` }} />
                      </div>
                      <span className="text-sm text-foreground/80">{f.label}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
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
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoleCards;
