import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n, type Locale } from "@/lib/i18n";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import AppLogo from "@/components/AppLogo";
import { Menu, X, Globe, ChevronDown } from "lucide-react";

const LANG_FLAGS: Record<string, string> = {
  fr: "🇫🇷", en: "🇬🇧", es: "🇪🇸", de: "🇩🇪", it: "🇮🇹", pt: "🇵🇹",
  nl: "🇳🇱", pl: "🇵🇱", tr: "🇹🇷", ar: "🇸🇦", ja: "🇯🇵", ko: "🇰🇷",
  zh: "🇨🇳", hi: "🇮🇳", th: "🇹🇭", vi: "🇻🇳", id: "🇮🇩", ms: "🇲🇾",
  sv: "🇸🇪", da: "🇩🇰", nb: "🇳🇴", fi: "🇫🇮", el: "🇬🇷", cs: "🇨🇿",
  hu: "🇭🇺", ro: "🇷🇴", hr: "🇭🇷", bg: "🇧🇬", sk: "🇸🇰", he: "🇮🇱", uk: "🇺🇦",
  ru: "🇷🇺", sw: "🇰🇪", bn: "🇧🇩", ta: "🇱🇰", te: "🇮🇳",
};

const LANG_NATIVE: Record<string, string> = {
  en: "English", fr: "Français", es: "Español", de: "Deutsch", it: "Italiano", pt: "Português",
  nl: "Nederlands", pl: "Polski", tr: "Türkçe", ar: "العربية", ja: "日本語", ko: "한국어",
  zh: "中文", hi: "हिन्दी", th: "ไทย", vi: "Tiếng Việt", id: "Bahasa", ms: "Melayu",
  sv: "Svenska", da: "Dansk", nb: "Norsk", fi: "Suomi", el: "Ελληνικά", cs: "Čeština",
  hu: "Magyar", ro: "Română", hr: "Hrvatski", bg: "Български", sk: "Slovenčina", he: "עברית", uk: "Українська",
  ru: "Русский", sw: "Kiswahili", bn: "বাংলা",
};

const POPULAR_LOCALES: Locale[] = ["en", "fr", "es", "de", "it", "pt", "nl", "ar", "ja", "ko", "zh", "tr"];

const Navbar = () => {
  const { t, locale, setLocale, availableLocales } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [langOpen]);

  const navLinks = [
    { to: "/explore", label: t("landing.nav.explore") || "Explore", isRoute: true },
    { to: "/marketplace", label: t("landing.nav.marketplace") || "Marketplace", isRoute: true },
    { to: "/properties", label: t("landing.nav.properties") || "Properties", isRoute: true },
    { to: "/dashboard/create-listing", label: t("landing.nav.post") || "Post a listing", isRoute: true, accent: true },
    { to: "#pricing", label: t("landing.nav.pricing") || "Pricing", isRoute: false },
  ];

  const sortedLocales = [
    ...POPULAR_LOCALES.filter(l => availableLocales.some(a => a.value === l)),
    ...availableLocales.filter(a => !POPULAR_LOCALES.includes(a.value as Locale)).map(a => a.value as Locale),
  ];

  return (
    <motion.nav
      aria-label="Main navigation"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        background: "hsl(var(--navy-deep) / 0.8)",
        borderColor: "hsl(220 15% 90% / 0.08)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      <div className="container flex items-center justify-between h-14 sm:h-16 px-4">
        <AppLogo variant="landing" linkTo="/" />

        {/* Center links — desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
          {navLinks.map((link) =>
            link.isRoute ? (
              <Link key={link.to} to={link.to} className={`transition-colors duration-200 ${(link as any).accent ? "text-accent font-semibold" : "hover:text-accent"}`}>
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
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
          {/* Language switcher — hidden on small mobile to save space */}
          <div className="relative hidden sm:block" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              aria-label="Change language"
              aria-expanded={langOpen}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors hover:bg-white/10 text-white/75 min-h-[44px]"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{LANG_FLAGS[locale] || "🌐"} {locale.toUpperCase()}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 w-56 max-h-80 overflow-y-auto bg-card rounded-xl shadow-2xl border border-border z-50 py-1"
                >
                  <p className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-widest font-bold text-muted-foreground">⭐ {t("landing.nav.popular") || "Popular"}</p>
                  {sortedLocales.slice(0, POPULAR_LOCALES.length).map((l) => {
                    const nativeName = LANG_NATIVE[l] || l.toUpperCase();
                    return (
                      <button
                        key={l}
                        onClick={() => { setLocale(l as Locale); setLangOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                          l === locale ? "bg-accent/10 text-accent font-semibold" : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="text-sm">{LANG_FLAGS[l] || "🌐"}</span>
                        <span>{nativeName}</span>
                        {l === locale && <span className="ml-auto text-accent">✓</span>}
                      </button>
                    );
                  })}
                  {sortedLocales.length > POPULAR_LOCALES.length && (
                    <>
                      <div className="my-1 border-t border-border" />
                      <p className="px-3 pt-1 pb-1 text-[9px] uppercase tracking-widest font-bold text-muted-foreground">{t("landing.nav.more_languages") || "More"}</p>
                      {sortedLocales.slice(POPULAR_LOCALES.length).map((l) => {
                        const nativeName = LANG_NATIVE[l] || l.toUpperCase();
                        return (
                          <button
                            key={l}
                            onClick={() => { setLocale(l as Locale); setLangOpen(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                              l === locale ? "bg-accent/10 text-accent font-semibold" : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="text-sm">{LANG_FLAGS[l] || "🌐"}</span>
                            <span>{nativeName}</span>
                            {l === locale && <span className="ml-auto text-accent">✓</span>}
                          </button>
                        );
                      })}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ThemeSwitcher />

          {/* Auth buttons — adapt to language, never overflow */}
          <Link
            to="/login"
            className="hidden sm:inline-block text-xs sm:text-sm font-medium transition-colors hover:text-accent px-2 sm:px-3 py-1.5 rounded-lg hover:bg-white/5 text-white/80 whitespace-nowrap"
          >
            {t("landing.nav.login") || "Log in"}
          </Link>
          <Link
            to="/signup"
            className="text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3.5 py-1 sm:py-1 rounded-lg transition-all relative overflow-hidden whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-[34px] inline-flex items-center"
            style={{
              background: "var(--gradient-gold)",
              color: "hsl(var(--accent-foreground))",
              boxShadow: "0 0 12px hsl(var(--accent) / 0.15)",
            }}
          >
            <span className="relative z-10 sm:hidden">{t("landing.nav.signup") || "Sign Up"}</span>
            <span className="relative z-10 hidden sm:inline">{t("landing.nav.pro_signup") || "Create Account"}</span>
          </Link>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg transition-colors text-white/80"
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
              borderColor: "hsl(220 15% 90% / 0.06)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="container px-4 py-5 space-y-1">
              {navLinks.map((link) => {
                const cls = "block w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-white/5 text-white/80";
                return link.isRoute ? (
                  <Link key={link.to} to={link.to} className={cls} onClick={() => setMobileOpen(false)}>
                    {link.label}
                  </Link>
                ) : (
                  <a key={link.to} href={link.to} className={cls} onClick={() => setMobileOpen(false)}>
                    {link.label}
                  </a>
                );
              })}

              {/* Mobile language grid */}
              <div className="pt-3 border-t space-y-2" style={{ borderColor: "hsl(220 15% 90% / 0.06)" }}>
                <p className="px-4 text-[10px] uppercase tracking-widest font-bold text-white/40">
                  {t("landing.nav.language") || "Language"}
                </p>
                <div className="flex flex-wrap gap-1.5 px-4">
                  {POPULAR_LOCALES.map(l => (
                    <button
                      key={l}
                      onClick={() => { setLocale(l as Locale); }}
                      className={`px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                        l === locale
                          ? "bg-accent text-accent-foreground"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {LANG_FLAGS[l]} {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t space-y-2" style={{ borderColor: "hsl(220 15% 90% / 0.06)" }}>
                <Link
                  to="/login"
                  className="block w-full text-center py-3 rounded-xl text-sm font-medium border transition-colors text-white/80 border-white/12"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("landing.nav.login") || "Log in"}
                </Link>
                <Link
                  to="/signup"
                  className="block w-full text-center py-2.5 rounded-xl text-sm font-bold relative overflow-hidden"
                  style={{
                    background: "var(--gradient-gold)",
                    color: "hsl(var(--accent-foreground))",
                    boxShadow: "0 0 16px hsl(var(--accent) / 0.2)",
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  {t("landing.nav.pro_signup") || "Sign Up"}
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
