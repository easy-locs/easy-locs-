import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import AppLogo from "@/components/AppLogo";

const Footer = React.forwardRef<HTMLElement>((_, ref) => {
  const { t } = useI18n();
  return (
    <footer ref={ref} className="bg-navy-deep text-primary-foreground/60 py-16">
      <div className="container">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <AppLogo variant="footer" linkTo="/" className="mb-4" />
            <p className="text-sm leading-relaxed">{t("landing.footer.desc")}</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-primary-foreground text-sm mb-3">{t("landing.footer.product")}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/#features" className="hover:text-primary-foreground transition-colors">{t("landing.footer.features")}</a></li>
              <li><a href="/#pricing" className="hover:text-primary-foreground transition-colors">{t("landing.footer.pricing")}</a></li>
              <li><Link to="/about" className="hover:text-primary-foreground transition-colors">{t("legal.about.title")}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-primary-foreground text-sm mb-3">{t("landing.footer.legal")}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/legal-notice" className="hover:text-primary-foreground transition-colors">{t("legal.notice.title")}</Link></li>
              <li><Link to="/privacy" className="hover:text-primary-foreground transition-colors">{t("legal.privacy.title")}</Link></li>
              <li><Link to="/terms" className="hover:text-primary-foreground transition-colors">{t("legal.terms.title")}</Link></li>
              <li><Link to="/cookies" className="hover:text-primary-foreground transition-colors">{t("legal.cookies.title")}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-primary-foreground text-sm mb-3">{t("legal.help.title_short")}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/help" className="hover:text-primary-foreground transition-colors">{t("legal.help.title")}</Link></li>
              <li><Link to="/contact" className="hover:text-primary-foreground transition-colors">{t("legal.contact.title")}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-primary-foreground text-sm mb-3">{t("landing.footer.contact")}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:contact@easy-locs.com" className="hover:text-primary-foreground transition-colors">contact@easy-locs.com</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 pt-8 text-sm text-center">
          © {new Date().getFullYear()} Easy-Locs®. {t("landing.footer.copyright")}
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
