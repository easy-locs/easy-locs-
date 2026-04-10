/**
 * Remote Entrepreneurship Section
 * Shows how users can manage businesses across multiple cities remotely.
 * Includes internal SEO links.
 */
import { motion } from "framer-motion";
import { Globe, MapPin, ArrowRight, Wifi, Laptop } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
const cities = [
  { flag: "🇫🇷", city: "Paris", serviceKey: "landing.remote.svc.cleaning", serviceFb: "Cleaning services", link: "/city/paris" },
  { flag: "🇹🇭", city: "Phuket", serviceKey: "landing.remote.svc.car", serviceFb: "Car rental", link: "/city/phuket" },
  { flag: "🇦🇪", city: "Dubai", serviceKey: "landing.remote.svc.activities", serviceFb: "Activities & tours", link: "/city/dubai" },
  { flag: "🇲🇦", city: "Marrakech", serviceKey: "landing.remote.svc.concierge", serviceFb: "Concierge services", link: "/city/marrakech" },
  { flag: "🇬🇧", city: "London", serviceKey: "landing.remote.svc.property", serviceFb: "Property management", link: "/city/london" },
  { flag: "🇺🇸", city: "Miami", serviceKey: "landing.remote.svc.seasonal", serviceFb: "Seasonal rentals", link: "/city/miami" },
];

const RemoteEntrepreneurship = () => {
  const { t } = useI18n();
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--accent) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.3) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full bg-accent/[0.03] blur-[150px] pointer-events-none" />

      <div className="container max-w-6xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Left — messaging */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <span
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] px-5 py-2 rounded-full border"
              style={{ color: "hsl(var(--gold-light))", background: "hsl(var(--accent) / 0.1)", borderColor: "hsl(var(--accent) / 0.25)" }}
            >
              <Wifi className="h-3.5 w-3.5" />
              {t("landing.remote.badge") || "Remote Entrepreneurship"}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight" style={{ color: "hsl(var(--primary-foreground))" }}>
              {t("landing.remote.title_1") || "Manage Operations in"}{" "}
              <span className="text-gradient-gold">{t("landing.remote.title_hl") || "Multiple Cities"}</span>
              <br />
              {t("landing.remote.title_2") || "From Anywhere"}
            </h2>
            <p className="text-base sm:text-lg leading-relaxed max-w-lg" style={{ color: "hsl(var(--primary-foreground) / 0.65)" }}>
              {t("landing.remote.desc") || "Run cleaning services in Paris, rent cars in Phuket, organize activities in Dubai, and coordinate concierge services in Marrakech — all from your laptop. Easy-Locs gives you the tools to operate service and property businesses remotely in any city worldwide."}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl text-sm font-bold transition-all relative overflow-hidden"
                style={{
                  background: "var(--gradient-gold)",
                  color: "hsl(var(--accent-foreground))",
                  boxShadow: "0 0 20px hsl(var(--accent) / 0.25)",
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                   {t("landing.remote.cta_create") || "Create Your Business"}
                   <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </Link>
              <Link
                to="/marketplace-services"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl text-sm font-semibold border transition-all"
                style={{
                  borderColor: "hsl(var(--primary-foreground) / 0.12)",
                  color: "hsl(var(--primary-foreground) / 0.7)",
                }}
              >
                <Globe className="h-4 w-4" />
                {t("landing.remote.cta_explore") || "Explore Marketplace"}
              </Link>
            </div>
          </motion.div>

          {/* Right — City cards grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {cities.map((c, i) => (
              <motion.div
                key={c.city}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4 }}
              >
                <Link
                  to={c.link}
                  className="group flex flex-col items-center text-center rounded-2xl p-3 sm:p-5 border transition-all duration-300 relative overflow-hidden"
                  style={{
                    borderColor: "hsl(var(--primary-foreground) / 0.06)",
                    background: "hsl(var(--primary-foreground) / 0.03)",
                  }}
                >
                  {/* Hover glow */}
                  <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-[40px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-accent" />

                  <div className="relative z-10">
                    <span className="text-2xl sm:text-3xl mb-1.5 sm:mb-2 block">{c.flag}</span>
                    <div className="font-bold text-sm mb-0.5" style={{ color: "hsl(var(--primary-foreground))" }}>
                      {c.city}
                    </div>
                    <div className="text-[10px] leading-snug line-clamp-1" style={{ color: "hsl(var(--primary-foreground) / 0.6)" }}>
                      {t(c.serviceKey) || c.serviceFb}
                    </div>
                  </div>

                  {/* Hover line */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "linear-gradient(90deg, transparent, hsl(var(--accent)), transparent)" }}
                  />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* How it works strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-5"
        >
          {[
            { step: "01", icon: Laptop, title: t("landing.remote.step1") || "Create Your Services", desc: t("landing.remote.step1_desc") || "Set up cleaning, transport, activities or any service in the cities you want to operate." },
            { step: "02", icon: Globe, title: t("landing.remote.step2") || "Manage Remotely", desc: t("landing.remote.step2_desc") || "Handle bookings, payments, and client communication from anywhere with internet." },
            { step: "03", icon: MapPin, title: t("landing.remote.step3") || "Scale to New Cities", desc: t("landing.remote.step3_desc") || "Expand your business to new locations without physical presence. Add cities in minutes." },
          ].map((s, i) => (
            <div
              key={s.step}
              className="rounded-2xl p-6 border relative overflow-hidden"
              style={{
                borderColor: "hsl(var(--primary-foreground) / 0.06)",
                background: "hsl(var(--primary-foreground) / 0.02)",
              }}
            >
              <div className="absolute top-4 right-4 text-3xl font-black opacity-[0.04]" style={{ color: "hsl(var(--primary-foreground))" }}>
                {s.step}
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "hsl(var(--accent) / 0.1)" }}
              >
                <s.icon className="h-5 w-5" style={{ color: "hsl(var(--accent))" }} />
              </div>
              <h4 className="font-bold text-sm mb-1.5" style={{ color: "hsl(var(--primary-foreground))" }}>
                {s.title}
              </h4>
              <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--primary-foreground) / 0.6)" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Internal SEO links */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-wrap items-center justify-center gap-3"
        >
          {[
            { to: "/long-term-rentals", label: "Long-Term Rentals" },
            { to: "/property-management", label: "Property Management" },
            { to: "/marketplace-services", label: "Service Marketplace" },
            { to: "/rental-management-software", label: "Rental Software" },
            { to: "/concierge-services", label: "Concierge Services" },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-xs font-medium px-4 py-2 rounded-full border transition-colors hover:border-accent/30"
              style={{
                borderColor: "hsl(var(--primary-foreground) / 0.08)",
                color: "hsl(var(--primary-foreground) / 0.65)",
              }}
            >
              {link.label}
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default RemoteEntrepreneurship;
