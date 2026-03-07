import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import AppLogo from "@/components/AppLogo";

const Footer = React.forwardRef<HTMLElement>((_, ref) => {
  const { t } = useI18n();

  return (
    <footer
      ref={ref}
      className="py-14 relative overflow-hidden"
      style={{ background: "hsl(var(--navy-deep))", color: "hsl(var(--primary-foreground) / 0.45)" }}
    >
      <div className="container relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <AppLogo variant="footer" linkTo="/" className="mb-4" />
            <p className="text-sm leading-relaxed">{t("landing.footer.desc")}</p>
          </div>

          {/* Links */}
          {[
            {
              title: t("landing.footer.product") || "Product",
              links: [
                { label: t("landing.nav.features"), to: "/#features" },
                { label: t("landing.nav.pricing"), to: "/#pricing" },
                { label: t("landing.footer.about") || "About", to: "/about" },
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
              title: t("landing.footer.support") || "Support",
              links: [
                { label: t("landing.footer.help") || "Help", to: "/help" },
                { label: t("landing.footer.contact") || "Contact", to: "/contact" },
                { label: t("landing.footer.api") || "API", to: "/developer" },
              ],
            },
            {
              title: "Contact",
              links: [
                { label: "contact@easy-locs.com", to: "mailto:contact@easy-locs.com", external: true },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-3" style={{ color: "hsl(var(--primary-foreground))" }}>
                {col.title}
              </h4>
              <ul className="space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link ? (
                      <a href={link.to} className="hover:text-primary-foreground transition-colors">{link.label}</a>
                    ) : link.to.startsWith("/") ? (
                      <Link to={link.to} className="hover:text-primary-foreground transition-colors">{link.label}</Link>
                    ) : (
                      <a href={link.to} className="hover:text-primary-foreground transition-colors">{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="border-t pt-6 text-sm text-center"
          style={{ borderColor: "hsl(var(--primary-foreground) / 0.08)" }}
        >
          © {new Date().getFullYear()} Easy-Locs®. {t("landing.footer.rights") || "All rights reserved."}
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
