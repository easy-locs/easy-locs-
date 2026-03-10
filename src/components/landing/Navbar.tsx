import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import AppLogo from "@/components/AppLogo";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: "/explore", label: "Explore", isRoute: true },
    { to: "#features", label: t("landing.nav.features"), isRoute: false },
    { to: "#pricing", label: t("landing.nav.pricing"), isRoute: false },
  ];

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
          {navLinks.map((link) =>
            link.isRoute ? (
              <Link key={link.to} to={link.to} className="hover:text-accent transition-colors duration-200">
                {link.label}
              </Link>
            ) : (
              <a key={link.to} href={link.to} className="hover:text-accent transition-colors duration-200">
                {link.label}
              </a>
            )
          )}
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
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="hidden sm:block">
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

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
            style={{ color: "hsl(var(--primary-foreground) / 0.8)" }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden overflow-hidden border-t"
            style={{
              background: "hsl(var(--navy-deep) / 0.95)",
              borderColor: "hsl(var(--primary-foreground) / 0.06)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="container px-4 py-5 space-y-1">
              {navLinks.map((link) => {
                const className =
                  "block w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-white/5";
                const style = { color: "hsl(var(--primary-foreground) / 0.8)" };

                return link.isRoute ? (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={className}
                    style={style}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.to}
                    href={link.to}
                    className={className}
                    style={style}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                );
              })}

              <div className="pt-3 border-t space-y-2" style={{ borderColor: "hsl(var(--primary-foreground) / 0.06)" }}>
                <Link
                  to="/login"
                  className="block w-full text-center py-3 rounded-xl text-sm font-medium border transition-colors"
                  style={{
                    borderColor: "hsl(var(--primary-foreground) / 0.12)",
                    color: "hsl(var(--primary-foreground) / 0.8)",
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  {t("landing.nav.login")}
                </Link>
                <Link
                  to="/signup"
                  className="block w-full text-center py-3 rounded-xl text-sm font-bold relative overflow-hidden"
                  style={{
                    background: "var(--gradient-gold)",
                    color: "hsl(var(--accent-foreground))",
                    boxShadow: "0 0 16px hsl(var(--accent) / 0.2)",
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  {t("landing.nav.pro_signup") || "Get Started"}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
