import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import AppLogo from "@/components/AppLogo";

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
    {
      title: "Contact",
      links: [
        { label: "contact@easy-locs.com", to: "mailto:contact@easy-locs.com", external: true },
      ],
    },
  ];

  return (
    <footer
      ref={ref}
      className="py-16 relative overflow-hidden"
      style={{ background: "hsl(var(--navy-deep))", color: "hsl(var(--primary-foreground) / 0.55)" }}
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `linear-gradient(hsl(var(--accent) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.3) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      <div className="container relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <AppLogo variant="footer" linkTo="/" className="mb-4" />
            <p className="text-sm leading-relaxed">{t("landing.footer.desc") || "Global property & service business platform for entrepreneurs worldwide."}</p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-4" style={{ color: "hsl(var(--primary-foreground) / 0.9)" }}>
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link ? (
                      <a href={link.to} className="hover:text-accent transition-colors duration-200">{link.label}</a>
                    ) : link.to.startsWith("/") ? (
                      <Link to={link.to} className="hover:text-accent transition-colors duration-200">{link.label}</Link>
                    ) : (
                      <a href={link.to} className="hover:text-accent transition-colors duration-200">{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Countries line */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="border-t pt-5 mb-5 text-xs text-center leading-relaxed"
          style={{ borderColor: "hsl(var(--primary-foreground) / 0.08)" }}
        >
          🇫🇷 🇪🇸 🇩🇪 🇮🇹 🇵🇹 🇬🇧 🇳🇱 🇧🇪 🇨🇭 🇦🇹 🇲🇦 🇦🇪 🇸🇦 🇯🇵 🇰🇷 🇨🇳 🇮🇳 🇧🇷 🇺🇸 🇨🇦 🇦🇺 🇹🇷 🇵🇱 🇷🇴 🇬🇷 🇨🇿 🇭🇺 🇭🇷 🇧🇬 🇸🇰 🇺🇦 🇮🇱
        </motion.div>

        <div
          className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm"
          style={{ borderColor: "hsl(var(--primary-foreground) / 0.08)" }}
        >
          <span>
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold" style={{ color: "hsl(var(--primary-foreground) / 0.8)" }}>
              Easy-Locs<sup className="text-[8px]">®</sup>
            </span>
            . {t("landing.footer.rights") || "All rights reserved."}
          </span>
          <div className="flex items-center gap-4 text-xs" style={{ color: "hsl(var(--primary-foreground) / 0.4)" }}>
            <span>SaaS Platform</span>
            <span>·</span>
            <span>110+ Countries</span>
            <span>·</span>
            <span>31 Languages</span>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
