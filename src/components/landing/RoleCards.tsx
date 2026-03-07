import { motion } from "framer-motion";
import { Building2, KeyRound, Plane, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const RoleCards = () => {
  const { user } = useAuth();

  const roles = [
    {
      icon: Building2,
      title: "Owner / Landlord",
      description: "Manage properties, tenants, rents, seasonal rentals, documents and payments.",
      cta: "Access Owner Dashboard",
      to: user ? "/dashboard" : "/login",
      color: "accent",
    },
    {
      icon: KeyRound,
      title: "Tenant",
      description: "Pay rent, access lease documents, communicate with landlord, receive notifications.",
      cta: "Access Tenant Space",
      to: user ? "/tenant" : "/tenant-signup",
      color: "info",
    },
    {
      icon: Plane,
      title: "Guest / Short-term Booking",
      description: "Book properties, select dates, pay online and add concierge services.",
      cta: "Book a Property",
      to: user ? "/dashboard/seasonal" : "/rentals",
      color: "success",
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-background relative overflow-hidden">
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
            Get Started
          </motion.span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4">
            Choose Your <span className="text-gradient-gold">Access</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
            Select your role to access the right tools and features instantly.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <Link
                to={role.to}
                className="group block h-full bg-card rounded-2xl border border-border/50 p-8 hover:border-accent/30 transition-all duration-300 relative overflow-hidden"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                {/* Top gradient glow on hover */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(90deg, transparent 0%, hsl(var(--${role.color})) 50%, transparent 100%)` }}
                />
                <div
                  className="absolute top-0 left-0 right-0 h-24 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(ellipse at top, hsl(var(--${role.color}) / 0.08) 0%, transparent 70%)` }}
                />

                <div className="relative z-10">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110"
                    style={{ background: `hsl(var(--${role.color}) / 0.1)` }}
                  >
                    <role.icon className="h-7 w-7" style={{ color: `hsl(var(--${role.color}))` }} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{role.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-8">{role.description}</p>
                  <div className="inline-flex items-center gap-2 text-sm font-bold text-accent group-hover:gap-3 transition-all">
                    {role.cta}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoleCards;
