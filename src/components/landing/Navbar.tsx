import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import AppLogo from "@/components/AppLogo";
import { Building2, KeyRound } from "lucide-react";

const Navbar = () => {
  const { t } = useI18n();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-deep/90 backdrop-blur-xl border-b border-primary-foreground/5">
      <div className="container flex items-center justify-between h-14 px-4">
        <AppLogo variant="landing" linkTo="/" />
        <div className="hidden md:flex items-center gap-6 text-sm text-primary-foreground/50">
          <a href="#features" className="hover:text-primary-foreground transition-colors">{t("landing.nav.features")}</a>
          <a href="#pricing" className="hover:text-primary-foreground transition-colors">{t("landing.nav.pricing")}</a>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeSwitcher />
          {/* Tenant access */}
          <Link
            to="/tenant-signup"
            className="hidden sm:flex items-center gap-1.5 text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors whitespace-nowrap"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {t("landing.nav.tenant_access") || "Espace locataire"}
          </Link>
          {/* Pro login */}
          <Link to="/login" className="flex items-center gap-1.5 text-sm font-medium text-primary-foreground/60 hover:text-primary-foreground transition-colors whitespace-nowrap">
            <Building2 className="h-3.5 w-3.5" />
            {t("landing.nav.login")}
          </Link>
          {/* Pro signup */}
          <Link to="/signup" className="text-sm font-semibold bg-gradient-gold text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap">
            {t("landing.nav.pro_signup") || "Créer mon compte pro"}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
