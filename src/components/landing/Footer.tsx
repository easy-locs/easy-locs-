import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import AppLogo from "@/components/AppLogo";

const Footer = React.forwardRef<HTMLElement>((_, ref) => {
  const { t } = useI18n();

  return (
    <footer ref={ref} className="py-16 relative overflow-hidden" style={{ background: 'hsl(var(--navy-deep))', color: 'hsl(var(--primary-foreground) / 0.5)' }}>
      {/* Accent glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full blur-[150px] bg-accent/5 pointer-events-none" />

      <div className="container relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <AppLogo variant="footer" linkTo="/" className="mb-4" />
            <p className="text-sm leading-relaxed">{t("landing.footer.desc")}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: 'hsl(var(--primary-foreground))' }}>{t("landing.footer.product") || "Product"}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/#features" className="hover:text-primary-foreground transition-colors">{t("landing.nav.features")}</a></li>
              <li><a href="/#pricing" className="hover:text-primary-foreground transition-colors">{t("landing.nav.pricing")}</a></li>
              <li><Link to="/about" className="hover:text-primary-foreground transition-colors">{t("landing.footer.about") || "About"}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: 'hsl(var(--primary-foreground))' }}>{t("landing.footer.legal") || "Legal"}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="hover:text-primary-foreground transition-colors">{t("landing.footer.terms") || "Terms & Conditions"}</Link></li>
              <li><Link to="/privacy" className="hover:text-primary-foreground transition-colors">{t("landing.footer.privacy") || "Privacy Policy"}</Link></li>
              <li><Link to="/legal-notice" className="hover:text-primary-foreground transition-colors">{t("landing.footer.legal_notice") || "Legal Notice"}</Link></li>
              <li><Link to="/cookies" className="hover:text-primary-foreground transition-colors">{t("landing.footer.cookies") || "Cookie Policy"}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: 'hsl(var(--primary-foreground))' }}>{t("landing.footer.support") || "Support"}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/help" className="hover:text-primary-foreground transition-colors">{t("landing.footer.help") || "Help Center"}</Link></li>
              <li><Link to="/contact" className="hover:text-primary-foreground transition-colors">{t("landing.footer.contact") || "Contact"}</Link></li>
              <li><Link to="/developer" className="hover:text-primary-foreground transition-colors">{t("landing.footer.api") || "API Access"}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: 'hsl(var(--primary-foreground))' }}>Contact</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:contact@easy-locs.com" className="hover:text-primary-foreground transition-colors">contact@easy-locs.com</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-8 text-sm text-center" style={{ borderColor: 'hsl(var(--primary-foreground) / 0.1)' }}>
          © {new Date().getFullYear()} Easy-Locs®. {t("landing.footer.rights") || "All rights reserved."}
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
