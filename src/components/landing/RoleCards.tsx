import { motion } from "framer-motion";
import { Building2, KeyRound, Plane, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";

const RoleCards = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const roles = [
    {
      icon: Building2,
      title: t("landing.roles.owner_title") || "Owner / Landlord",
      description: t("landing.roles.owner_desc") || "Manage properties, tenants, rents, seasonal rentals, documents and payments.",
      cta: t("landing.roles.owner_cta") || "Access Dashboard",
      to: user ? "/dashboard" : "/login",
      color: "accent",
    },
    {
      icon: KeyRound,
      title: t("landing.roles.tenant_title") || "Tenant",
      description: t("landing.roles.tenant_desc") || "Pay rent, access lease documents, communicate with landlord, receive notifications.",
      cta: t("landing.roles.tenant_cta") || "Tenant Space",
      to: user ? "/tenant" : "/tenant-signup",
      color: "info",
    },
    {
      icon: Plane,
      title: t("landing.roles.guest_title") || "Guest / Traveler",
      description: t("landing.roles.guest_desc") || "Book properties, select dates, pay online and add concierge services.",
      cta: t("landing.roles.guest_cta") || "Book Now",
      to: user ? "/dashboard/seasonal" : "/rentals",
      color: "success",
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-background relative overflow-hidden">
      <div className="container max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 space-y-4"
        >
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5">
            Get Started
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            Choose Your <span className="text-gradient-gold">Access</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
            Select your role to access the right tools instantly.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6 }}
            >
              <Link
                to={role.to}
                className="group flex flex-col h-full bg-card rounded-2xl border border-border/50 p-7 hover:border-accent/30 transition-all duration-300 relative overflow-hidden"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {/* Top accent bar on hover */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                  style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${role.color})), transparent)` }}
                />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `hsl(var(--${role.color}) / 0.1)` }}
                >
                  <role.icon className="h-6 w-6" style={{ color: `hsl(var(--${role.color}))` }} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{role.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">{role.description}</p>
                <div className="inline-flex items-center gap-2 text-sm font-bold text-accent group-hover:gap-3 transition-all">
                  {role.cta}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
