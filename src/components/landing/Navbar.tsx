import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import AppLogo from "@/components/AppLogo";
import { Building2, KeyRound } from "lucide-react";

const Navbar = () => {
  const { t } = useI18n();
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-primary-foreground/5"
      style={{
        background: 'hsl(var(--navy-deep) / 0.7)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div className="container flex items-center justify-between h-16 px-4">
        <AppLogo variant="landing" linkTo="/" />
        <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: 'hsl(var(--primary-foreground) / 0.5)' }}>
          <a href="#features" className="hover:text-accent transition-colors duration-300 relative group">
            {t("landing.nav.features")}
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-accent group-hover:w-full transition-all duration-300" />
          </a>
          <a href="#pricing" className="hover:text-accent transition-colors duration-300 relative group">
            {t("landing.nav.pricing")}
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-accent group-hover:w-full transition-all duration-300" />
          </a>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeSwitcher />
          <Link
            to="/tenant-signup"
            className="hidden sm:flex items-center gap-1.5 text-sm transition-colors whitespace-nowrap hover:text-accent"
            style={{ color: 'hsl(var(--primary-foreground) / 0.45)' }}
          >
            <KeyRound className="h-3.5 w-3.5" />
            {t("landing.nav.tenant_access") || "Espace locataire"}
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm font-medium transition-colors whitespace-nowrap hover:text-accent"
            style={{ color: 'hsl(var(--primary-foreground) / 0.55)' }}
          >
            <Building2 className="h-3.5 w-3.5" />
            {t("landing.nav.login")}
          </Link>
          <Link
            to="/signup"
            className="text-sm font-bold bg-gradient-gold text-accent-foreground px-5 py-2.5 rounded-xl hover:opacity-90 transition-all whitespace-nowrap relative overflow-hidden group"
            style={{ boxShadow: '0 0 20px hsl(var(--accent) / 0.2)' }}
          >
            <span className="relative z-10">{t("landing.nav.pro_signup") || "Créer mon compte pro"}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
