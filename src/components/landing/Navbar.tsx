import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useI18n, type Locale } from "@/lib/i18n";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import AppLogo from "@/components/AppLogo";
import {
  Menu, X, Globe, ChevronDown, ChevronRight,
  Store, Building2, UtensilsCrossed, Briefcase, MapPin,
  Sparkles, Shield, Rocket, Crown,
} from "lucide-react";

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
  const [mobileLangOpen, setMobileLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 80], [0.6, 0.92]);

  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [langOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setMobileLangOpen(false);
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

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

  const joinOptions = [
    { icon: Store, label: t("landing.join.shop") || "Open a Shop", desc: t("landing.join.shop_desc") || "Start selling online", to: "/signup?role=shop" },
    { icon: UtensilsCrossed, label: t("landing.join.restaurant") || "Restaurant", desc: t("landing.join.restaurant_desc") || "List your restaurant", to: "/signup?role=restaurant" },
    { icon: Building2, label: t("landing.join.agency") || "Real Estate Agency", desc: t("landing.join.agency_desc") || "Manage properties & teams", to: "/signup?role=agency" },
    { icon: Briefcase, label: t("landing.join.provider") || "Service Provider", desc: t("landing.join.provider_desc") || "Offer your services", to: "/signup?role=provider" },
  ];

  return (
    <motion.nav
      aria-label="Main navigation"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "hsl(var(--navy-deep) / 0.92)",
        borderBottom: "1px solid hsl(220 15% 90% / 0.06)",
        backdropFilter: "blur(12px) saturate(140%)",
        WebkitBackdropFilter: "blur(12px) saturate(140%)",
      }}
    >
      <div className="container flex items-center justify-between h-14 sm:h-16 px-4">
        <AppLogo variant="landing" linkTo="/" />

        {/* Center links — desktop */}
        <div className="hidden md:flex items-center gap-1 text-sm font-medium">
          {navLinks.map((link) => {
            const cls = (link as any).accent
              ? "text-accent font-semibold px-3 py-1.5 rounded-lg hover:bg-accent/10 transition-all"
              : "text-white/65 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all";
            return link.isRoute ? (
              <Link key={link.to} to={link.to} className={cls}>{link.label}</Link>
            ) : (
              <a key={link.to} href={link.to} className={cls}>{link.label}</a>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
          {/* Language switcher — desktop */}
          <div className="relative hidden sm:block" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              aria-label="Change language"
              aria-expanded={langOpen}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all hover:bg-white/10 text-white/75 min-h-[44px]"
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
                  className="absolute right-0 top-full mt-1 w-56 max-h-80 overflow-y-auto rounded-xl shadow-2xl border border-border z-50 py-1"
                  style={{ background: "hsl(var(--card))" }}
                >
                  <p className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-widest font-bold text-muted-foreground">⭐ {t("landing.nav.popular") || "Popular"}</p>
                  {sortedLocales.slice(0, POPULAR_LOCALES.length).map((l) => (
                    <button
                      key={l}
                      onClick={() => { setLocale(l as Locale); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                        l === locale ? "bg-accent/10 text-accent font-semibold" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="text-sm">{LANG_FLAGS[l] || "🌐"}</span>
                      <span>{LANG_NATIVE[l] || l.toUpperCase()}</span>
                      {l === locale && <span className="ml-auto text-accent">✓</span>}
                    </button>
                  ))}
                  {sortedLocales.length > POPULAR_LOCALES.length && (
                    <>
                      <div className="my-1 border-t border-border" />
                      <p className="px-3 pt-1 pb-1 text-[9px] uppercase tracking-widest font-bold text-muted-foreground">{t("landing.nav.more_languages") || "More"}</p>
                      {sortedLocales.slice(POPULAR_LOCALES.length).map((l) => (
                        <button
                          key={l}
                          onClick={() => { setLocale(l as Locale); setLangOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                            l === locale ? "bg-accent/10 text-accent font-semibold" : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <span className="text-sm">{LANG_FLAGS[l] || "🌐"}</span>
                          <span>{LANG_NATIVE[l] || l.toUpperCase()}</span>
                          {l === locale && <span className="ml-auto text-accent">✓</span>}
                        </button>
                      ))}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ThemeSwitcher />

          <Link
            to="/login"
            className="hidden sm:inline-block text-xs sm:text-sm font-medium transition-all hover:text-accent px-2 sm:px-3 py-1.5 rounded-lg hover:bg-white/5 text-white/80 whitespace-nowrap"
          >
            {t("landing.nav.login") || "Log in"}
          </Link>

          <Link
            to="/signup"
            className="text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3.5 py-1 sm:py-1 rounded-xl transition-all relative overflow-hidden whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-[34px] inline-flex items-center group"
            style={{
              background: "var(--gradient-gold)",
              color: "hsl(var(--accent-foreground))",
              boxShadow: "0 0 16px hsl(var(--accent) / 0.2)",
            }}
          >
            <span className="relative z-10 sm:hidden">{t("landing.nav.signup") || "Sign Up"}</span>
            <span className="relative z-10 hidden sm:inline">{t("landing.nav.pro_signup") || "Create Account"}</span>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
          </Link>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-lg transition-colors text-white/80 hover:bg-white/10"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileOpen ? "close" : "open"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* ===== PREMIUM MOBILE MENU ===== */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden overflow-y-auto"
            style={{
              maxHeight: "calc(100dvh - 56px)",
              background: "hsl(var(--navy-deep) / 0.98)",
              borderTop: "1px solid hsl(220 15% 90% / 0.06)",
            }}
          >
            <div className="px-4 pt-4 pb-6 space-y-3">

              {/* ── Branded header block ── */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.08))",
                  border: "1px solid hsl(var(--accent) / 0.12)",
                }}
              >
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6" style={{ background: "hsl(var(--accent) / 0.06)" }} />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
                    <Crown className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Easy-Locs</p>
                    <p className="text-[10px] text-white/50">{t("landing.menu.tagline") || "Your super-app for everything local"}</p>
                  </div>
                </div>
              </motion.div>

              {/* ── Navigation links ── */}
              <div className="space-y-0.5">
                <p className="px-3 pt-1 pb-1.5 text-[9px] uppercase tracking-[0.15em] font-bold text-white/30">
                  {t("landing.menu.discover") || "Discover"}
                </p>
                {navLinks.map((link, i) => {
                  const cls = `flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                    (link as any).accent 
                      ? "text-accent hover:bg-accent/10" 
                      : "text-white/80 hover:bg-white/5"
                  }`;
                  const inner = (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.06 + i * 0.03 }}
                      className="flex items-center justify-between w-full"
                    >
                      <span>{link.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-30" />
                    </motion.div>
                  );
                  return link.isRoute ? (
                    <Link key={link.to} to={link.to} className={cls} onClick={() => setMobileOpen(false)}>{inner}</Link>
                  ) : (
                    <a key={link.to} href={link.to} className={cls} onClick={() => setMobileOpen(false)}>{inner}</a>
                  );
                })}
              </div>

              {/* ── Join / Sell Acquisition Block ── */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--accent) / 0.08), hsl(var(--primary) / 0.06))",
                  border: "1px solid hsl(var(--accent) / 0.12)",
                }}
              >
                <div className="px-4 pt-3.5 pb-2 flex items-center gap-2">
                  <Rocket className="w-3.5 h-3.5 text-accent" />
                  <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-accent">
                    {t("landing.menu.join_platform") || "Join the platform"}
                  </p>
                </div>
                <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                  {joinOptions.map((opt, i) => {
                    const Icon = opt.icon;
                    return (
                      <Link
                        key={i}
                        to={opt.to}
                        onClick={() => setMobileOpen(false)}
                        className="flex flex-col gap-1.5 p-3 rounded-xl transition-all active:scale-[0.97] hover:bg-white/5"
                        style={{ background: "hsl(0 0% 100% / 0.04)" }}
                      >
                        <Icon className="w-4 h-4 text-accent/80" />
                        <span className="text-xs font-semibold text-white/90 leading-tight">{opt.label}</span>
                        <span className="text-[10px] text-white/40 leading-tight">{opt.desc}</span>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>

              {/* ── Promotional trust strip ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: "hsl(0 0% 100% / 0.03)" }}
              >
                <Shield className="w-4 h-4 text-accent/60 shrink-0" />
                <p className="text-[10px] text-white/40 leading-snug">
                  {t("landing.menu.trust") || "Secure payments • Verified sellers • 24/7 support"}
                </p>
              </motion.div>

              {/* ── Language — Compact row (expands to sub-panel) ── */}
              <div>
                <button
                  onClick={() => setMobileLangOpen(!mobileLangOpen)}
                  className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-white/40" />
                    <span>{LANG_FLAGS[locale]} {LANG_NATIVE[locale] || locale.toUpperCase()}</span>
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${mobileLangOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {mobileLangOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-1.5 px-3 py-2">
                        {sortedLocales.map(l => (
                          <button
                            key={l}
                            onClick={() => { setLocale(l as Locale); setMobileLangOpen(false); }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
                              l === locale
                                ? "bg-accent text-accent-foreground shadow-sm"
                                : "text-white/50 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            {LANG_FLAGS[l]} {LANG_NATIVE[l] || l.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Auth CTAs ── */}
              <div className="space-y-2 pt-1">
                <Link
                  to="/login"
                  className="flex items-center justify-center w-full py-3 min-h-[44px] rounded-xl text-sm font-medium border transition-all text-white/80 hover:text-white"
                  style={{ borderColor: "hsl(0 0% 100% / 0.1)" }}
                  onClick={() => setMobileOpen(false)}
                >
                  {t("landing.nav.login") || "Log in"}
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center justify-center w-full py-3 min-h-[44px] rounded-xl text-sm font-bold relative overflow-hidden group"
                  style={{
                    background: "var(--gradient-gold)",
                    color: "hsl(var(--accent-foreground))",
                    boxShadow: "0 0 20px hsl(var(--accent) / 0.2)",
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t("landing.nav.pro_signup") || "Create your account"}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
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
