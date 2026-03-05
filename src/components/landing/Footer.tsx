import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import logoEasylocs from "@/assets/logo-easylocs.png";

const Footer = React.forwardRef<HTMLElement>((_, ref) => {
  const { t } = useI18n();
  return (
    <footer ref={ref} className="bg-navy-deep text-primary-foreground/60 py-16">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={logoEasylocs} alt="Easy-Locs" className="h-8 w-auto object-contain" />
              <span className="text-lg font-bold text-primary-foreground">Easy-Locs<sup className="text-[8px] align-super ml-0.5 text-primary-foreground/60">®</sup></span>
            </Link>
            <p className="text-sm leading-relaxed">{t("landing.footer.desc")}</p>
          </div>
          <div>
            <h4 className="font-semibold text-primary-foreground text-sm mb-3">{t("landing.footer.product")}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-primary-foreground transition-colors">{t("landing.footer.features")}</a></li>
              <li><a href="#pricing" className="hover:text-primary-foreground transition-colors">{t("landing.footer.pricing")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-primary-foreground text-sm mb-3">{t("landing.footer.legal")}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">{t("landing.footer.legal_notices")}</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">{t("landing.footer.privacy")}</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">{t("landing.footer.terms")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-primary-foreground text-sm mb-3">{t("landing.footer.contact")}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:contact@easy-locs.com" className="hover:text-primary-foreground transition-colors">contact@easy-locs.com</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 pt-8 text-sm text-center">
          © {new Date().getFullYear()} Easy-Locs. {t("landing.footer.copyright")}
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;