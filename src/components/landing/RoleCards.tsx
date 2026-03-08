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
      description: t("landing.roles.owner_desc") || "Full property management suite",
      features: [
        { icon: Home, label: t("landing.features.property.title") || "Manage Properties" },
        { icon: Users, label: t("landing.features.communication.title") || "Tenants" },
        { icon: FileSignature, label: t("landing.features.contracts.title") || "Leases & Contracts" },
        { icon: CalendarRange, label: t("landing.features.seasonal.title") || "Seasonal Rentals" },
        { icon: CreditCard, label: t("landing.features.payments.title") || "Payments & Receipts" },
      ],
      cta: t("landing.roles.owner_cta") || "Access Dashboard",
      to: user ? "/dashboard" : "/login",
      color: "accent",
      gradient: "linear-gradient(135deg, hsl(var(--accent) / 0.06) 0%, hsl(var(--accent) / 0.02) 100%)",
    },
    {
      icon: ConciergeBell,
      title: t("landing.roles.guest_title") || "Service Provider / Concierge",
      description: t("landing.roles.guest_desc") || "Activities, services & booking management",
      features: [
        { icon: Sparkles, label: t("landing.features.concierge.title") || "Activities & Experiences" },
        { icon: Car, label: "Car Rental" },
        { icon: Brush, label: "Cleaning & Maintenance" },
        { icon: MapPin, label: "Local Services" },
        { icon: CalendarCheck, label: "Booking Management" },
      ],
      cta: t("landing.roles.guest_cta") || "Open Marketplace",
      to: user ? "/dashboard/marketplace" : "/rentals",
      color: "info",
      gradient: "linear-gradient(135deg, hsl(var(--info) / 0.06) 0%, hsl(var(--info) / 0.02) 100%)",
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-background relative overflow-hidden">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.012]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
        backgroundSize: "40px 40px",
      }} />

      <div className="container max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5">
            {t("landing.roles.badge") || "Get Started"}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            {t("landing.roles.title") || "Choose Your"}{" "}
            <span className="text-gradient-gold">{t("landing.roles.title_highlight") || "Workspace"}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
            {t("landing.roles.subtitle") || "Two powerful workspaces designed for different needs."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              whileHover={{ y: -6 }}
            >
              <div
                className="flex flex-col h-full rounded-2xl border p-8 transition-all duration-300 relative overflow-hidden group"
                style={{
                  background: role.gradient,
                  borderColor: `hsl(var(--${role.color}) / 0.12)`,
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: `linear-gradient(90deg, hsl(var(--${role.color})), hsl(var(--${role.color}) / 0.2))` }}
                />

                {/* Hover glow */}
                <div
                  className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                  style={{ background: `hsl(var(--${role.color}))` }}
                />

                {/* Icon + Title */}
                <div className="flex items-center gap-4 mb-3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `hsl(var(--${role.color}) / 0.1)` }}
                  >
                    <role.icon className="h-7 w-7" style={{ color: `hsl(var(--${role.color}))` }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{role.title}</h3>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px my-5" style={{ background: `hsl(var(--${role.color}) / 0.1)` }} />

                {/* Feature list */}
                <ul className="space-y-3.5 mb-8 flex-1">
                  {role.features.map((f) => (
                    <li key={f.label} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `hsl(var(--${role.color}) / 0.06)` }}
                      >
                        <f.icon className="h-4 w-4" style={{ color: `hsl(var(--${role.color}) / 0.7)` }} />
                      </div>
                      <span className="text-sm text-foreground/80">{f.label}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  to={role.to}
                  className="group/btn inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: `hsl(var(--${role.color}) / 0.1)`,
                    color: `hsl(var(--${role.color}))`,
                    border: `1px solid hsl(var(--${role.color}) / 0.2)`,
                  }}
                >
                  {role.cta}
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
