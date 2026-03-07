import { Link } from "react-router-dom";
import logoEasylocs from "@/assets/logo-easylocs.png";
import { useI18n } from "@/lib/i18n";

const Navbar = () => {
  const { t } = useI18n();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-deep/90 backdrop-blur-xl border-b border-primary-foreground/5">
      <div className="container flex items-center justify-between h-14 px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logoEasylocs} alt="EASY-LOCS" className="h-8 w-auto object-contain" />
          <span className="text-base font-bold tracking-tight text-primary-foreground whitespace-nowrap">
            EASY-LOCS<sup className="text-[8px] align-super ml-0.5 text-primary-foreground/40">®</sup>
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-primary-foreground/50">
          <a href="#features" className="hover:text-primary-foreground transition-colors">{t("landing.nav.features")}</a>
          <a href="#pricing" className="hover:text-primary-foreground transition-colors">{t("landing.nav.pricing")}</a>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/login" className="text-sm font-medium text-primary-foreground/60 hover:text-primary-foreground transition-colors whitespace-nowrap">
            {t("landing.nav.login")}
          </Link>
          <Link to="/signup" className="text-sm font-semibold bg-gradient-gold text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap">
            {t("landing.nav.signup")}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
