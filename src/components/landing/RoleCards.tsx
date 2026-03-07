import { motion } from "framer-motion";
import { Building2, KeyRound, Plane, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const roles = [
  {
    icon: Building2,
    title: "Owner / Landlord",
    description: "Manage properties, tenants, rents, seasonal rentals, documents and payments.",
    cta: "Access Owner Dashboard",
    to: "/login",
    gradient: "from-accent/15 to-accent/5",
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
  },
  {
    icon: KeyRound,
    title: "Tenant",
    description: "Pay rent, access lease documents, communicate with landlord, receive notifications.",
    cta: "Access Tenant Space",
    to: "/tenant-signup",
    gradient: "from-info/15 to-info/5",
    iconBg: "bg-info/15",
    iconColor: "text-info",
  },
  {
    icon: Plane,
    title: "Guest / Short-term Booking",
    description: "Book properties, select dates, pay online and add concierge services.",
    cta: "Book a Property",
    to: "/rentals",
    gradient: "from-success/15 to-success/5",
    iconBg: "bg-success/15",
    iconColor: "text-success",
  },
];

const RoleCards = () => {
  return (
    <section className="py-20 sm:py-28 bg-background">
      <div className="container max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Choose Your <span className="text-gradient-gold">Access</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Select your role to access the right tools and features instantly.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={role.to}
                className={`group block h-full bg-gradient-to-b ${role.gradient} bg-card rounded-2xl border border-border/50 p-8 hover:border-accent/30 hover:shadow-card-hover transition-all`}
              >
                <div className={`w-14 h-14 rounded-xl ${role.iconBg} flex items-center justify-center mb-6`}>
                  <role.icon className={`h-7 w-7 ${role.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{role.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">{role.description}</p>
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-accent group-hover:gap-3 transition-all">
                  {role.cta}
                  <ArrowRight className="h-4 w-4" />
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
