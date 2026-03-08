import { motion } from "framer-motion";
import {
  Building2, ConciergeBell, ArrowRight,
  Home, Users, FileSignature, CalendarRange, CreditCard,
  Car, Sparkles, Brush, MapPin, CalendarCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";

const RoleCards = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const roles = [
    {
      icon: Building2,
      title: t("landing.roles.owner_title") || "Property Owner / Manager",
      features: [
        { icon: Home, label: t("landing.features.property.title") || "Manage Properties" },
        { icon: Users, label: t("landing.features.communication.title") || "Tenants" },
        { icon: FileSignature, label: t("landing.features.contracts.title") || "Leases" },
        { icon: CalendarRange, label: t("landing.features.seasonal.title") || "Seasonal Rentals" },
        { icon: CreditCard, label: t("landing.features.payments.title") || "Payments" },
      ],
      cta: t("landing.roles.owner_cta") || "Access Dashboard",
      to: user ? "/dashboard" : "/login",
      color: "accent",
    },
    {
      icon: ConciergeBell,
      title: t("landing.roles.guest_title") || "Service Provider / Concierge",
      features: [
        { icon: Sparkles, label: t("landing.features.concierge.title") || "Activities" },
        { icon: Car, label: "Car Rental" },
        { icon: Brush, label: "Cleaning" },
        { icon: MapPin, label: "Local Services" },
        { icon: CalendarCheck, label: "Booking Management" },
      ],
      cta: t("landing.roles.guest_cta") || "Open Marketplace",
      to: user ? "/dashboard/marketplace" : "/rentals",
      color: "info",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
      <div className="container max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 space-y-3"
        >
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5">
            {t("landing.roles.badge") || "Access"}
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground leading-tight">
            {t("landing.roles.title") || "Choose Your"}{" "}
            <span className="text-gradient-gold">{t("landing.roles.title_highlight") || "Access"}</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <div
                className="flex flex-col h-full bg-card rounded-2xl border border-border/50 p-7 hover:border-accent/30 transition-all duration-300 relative overflow-hidden"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                  style={{ background: `linear-gradient(90deg, hsl(var(--${role.color})), hsl(var(--${role.color}) / 0.3))` }}
                />

                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `hsl(var(--${role.color}) / 0.1)` }}
                  >
                    <role.icon className="h-6 w-6" style={{ color: `hsl(var(--${role.color}))` }} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{role.title}</h3>
                </div>

                {/* Feature list */}
                <ul className="space-y-3 mb-8 flex-1">
                  {role.features.map((f) => (
                    <li key={f.label} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <f.icon className="h-4 w-4 shrink-0" style={{ color: `hsl(var(--${role.color}) / 0.7)` }} />
                      <span>{f.label}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  to={role.to}
                  className="group inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: `hsl(var(--${role.color}) / 0.1)`,
                    color: `hsl(var(--${role.color}))`,
                    border: `1px solid hsl(var(--${role.color}) / 0.2)`,
                  }}
                >
                  {role.cta}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
