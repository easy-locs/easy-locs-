import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import AppLogo from "@/components/AppLogo";
import { ArrowUpRight } from "lucide-react";

const Footer = React.forwardRef<HTMLElement>((_, ref) => {
  const { t } = useI18n();

  const columns = [
    {
      title: t("landing.footer.product") || "Product",
      links: [
        { label: "Explore", to: "/explore" },
        { label: t("landing.nav.features") || "Features", to: "/#features" },
        { label: t("landing.nav.pricing") || "Pricing", to: "/#pricing" },
        { label: t("landing.footer.api") || "API", to: "/developer" },
      ],
    },
    {
      title: t("landing.footer.services") || "Services",
      links: [
        { label: t("landing.footer.long_term") || "Long-Term Rentals", to: "/long-term-rentals" },
        { label: t("landing.footer.seasonal") || "Seasonal Rentals", to: "/seasonal-rentals" },
        { label: t("landing.footer.marketplace") || "Marketplace", to: "/marketplace-services" },
        { label: t("landing.footer.concierge") || "Concierge", to: "/concierge-services" },
      ],
    },
    {
      title: t("landing.footer.about") || "About",
      links: [
        { label: t("landing.footer.about") || "About", to: "/about" },
        { label: t("landing.footer.contact") || "Contact", to: "/contact" },
        { label: t("landing.footer.help") || "Support", to: "/help" },
      ],
    },
    {
      title: t("landing.footer.legal") || "Legal",
      links: [
        { label: t("landing.footer.terms") || "Terms", to: "/terms" },
        { label: t("landing.footer.privacy") || "Privacy", to: "/privacy" },
        { label: t("landing.footer.legal_notice") || "Legal Notice", to: "/legal-notice" },
        { label: t("landing.footer.cookies") || "Cookies", to: "/cookies" },
      ],
    },
  ];

  const topCities = [
    { name: "Paris", slug: "paris" },
    { name: "Dubai", slug: "dubai" },
    { name: "Barcelona", slug: "barcelona" },
    { name: "London", slug: "london" },
    { name: "Marrakech", slug: "marrakech" },
    { name: "Lisbon", slug: "lisbon" },
    { name: "Bangkok", slug: "bangkok" },
    { name: "Tokyo", slug: "tokyo" },
    { name: "Istanbul", slug: "istanbul" },
    { name: "Bali", slug: "bali" },
    { name: "Miami", slug: "miami" },
    { name: "Rome", slug: "rome" },
  ];

  return (
    <footer
      aria-label="Site footer"
      ref={ref}
      className="py-12 sm:py-20 relative overflow-hidden"
      style={{ background: "hsl(var(--navy-deep))", color: "hsl(var(--primary-foreground) / 0.55)" }}
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.012]" style={{
        backgroundImage: `linear-gradient(hsl(var(--accent) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.3) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px]" style={{
        background: "linear-gradient(90deg, transparent, hsl(var(--accent) / 0.3), transparent)",
      }} />

      <div className="container relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8 mb-10 sm:mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <AppLogo variant="footer" linkTo="/" className="mb-4" />
            <p className="text-sm leading-relaxed">{t("landing.footer.desc") || "Global property & service business platform for entrepreneurs worldwide."}</p>
            <p className="text-xs mt-3">
              <a href="mailto:contact@easy-locs.com" className="hover:text-accent transition-colors inline-flex items-center gap-1">
                contact@easy-locs.com
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </p>
          </div>

          {columns.map((col, ci) => (
            <motion.div
              key={col.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: ci * 0.05 }}
            >
              <h4 className="font-semibold text-sm mb-4" style={{ color: "hsl(var(--primary-foreground) / 0.9)" }}>
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.to.startsWith("/") ? (
                      <Link to={link.to} className="hover:text-accent transition-colors duration-200 hover:translate-x-0.5 inline-block">{link.label}</Link>
                    ) : (
                      <a href={link.to} className="hover:text-accent transition-colors duration-200">{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* SEO city links */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="border-t pt-6 mb-6"
          style={{ borderColor: "hsl(var(--primary-foreground) / 0.08)" }}
        >
          <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: "hsl(var(--primary-foreground) / 0.3)" }}>
            {t("landing.footer.top_cities") || "Top Cities"}
          </p>
          <div className="flex flex-wrap gap-2">
            {topCities.map((city) => (
              <Link
                key={city.slug}
                to={`/city/${city.slug}`}
                className="text-xs px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-lg border transition-all hover:border-accent/30 hover:text-accent hover:bg-accent/5 inline-flex items-center"
                style={{ borderColor: "hsl(var(--primary-foreground) / 0.08)", color: "hsl(var(--primary-foreground) / 0.5)" }}
              >
                {city.name}
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Bottom bar */}
        <div
          className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm"
          style={{ borderColor: "hsl(var(--primary-foreground) / 0.08)" }}
        >
          <span className="text-center sm:text-left">
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold" style={{ color: "hsl(var(--primary-foreground) / 0.8)" }}>
              Easy-Locs<sup className="text-[8px]">®</sup>
            </span>
            . {t("landing.footer.rights") || "All rights reserved."}
          </span>
          <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs" style={{ color: "hsl(var(--primary-foreground) / 0.4)" }}>
            <span>{t("landing.footer.saas") || "SaaS Platform"}</span>
            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
            <span>{t("landing.footer.countries_count") || "190+ Countries"}</span>
            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
            <span>{t("landing.footer.languages_count") || "31 Languages"}</span>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
