import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import AppLogo from "@/components/AppLogo";

const Navbar = () => {
  const { t } = useI18n();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        background: "hsl(var(--navy-deep) / 0.8)",
        borderColor: "hsl(var(--primary-foreground) / 0.08)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      <div className="container flex items-center justify-between h-16 px-4">
        <AppLogo variant="landing" linkTo="/" />

        {/* Center links — desktop */}
        <div
          className="hidden md:flex items-center gap-8 text-sm font-medium"
          style={{ color: "hsl(var(--primary-foreground) / 0.7)" }}
        >
          <Link to="/explore" className="hover:text-accent transition-colors duration-200">
            Explore
          </Link>
          <a href="#features" className="hover:text-accent transition-colors duration-200">
            {t("landing.nav.features")}
          </a>
          <a href="#pricing" className="hover:text-accent transition-colors duration-200">
            {t("landing.nav.pricing")}
          </a>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3 shrink-0">
          <ThemeSwitcher />
          <Link
            to="/login"
            className="hidden sm:inline-flex text-sm font-medium transition-colors hover:text-accent"
            style={{ color: "hsl(var(--primary-foreground) / 0.75)" }}
          >
            {t("landing.nav.login")}
          </Link>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/signup"
              className="text-sm font-bold px-5 py-2 rounded-xl transition-all relative overflow-hidden group"
              style={{
                background: "var(--gradient-gold)",
                color: "hsl(var(--accent-foreground))",
                boxShadow: "0 0 16px hsl(var(--accent) / 0.2)",
              }}
            >
              <span className="relative z-10">{t("landing.nav.pro_signup") || "Get Started"}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
