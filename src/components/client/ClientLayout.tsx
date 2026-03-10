import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, type Locale } from "@/lib/i18n";
import AppLogo from "@/components/AppLogo";
import {
  LayoutDashboard, Search, MessageCircle, CalendarCheck,
  Settings, LogOut, Menu, X, FileText, CreditCard, Globe,
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeSwitcher from "@/components/ThemeSwitcher";

const LOCALE_FLAGS: Record<string, string> = {
  fr: "🇫🇷", en: "🇬🇧", es: "🇪🇸", de: "🇩🇪", it: "🇮🇹", pt: "🇵🇹", nl: "🇳🇱",
  pl: "🇵🇱", tr: "🇹🇷", ar: "🇸🇦", ja: "🇯🇵", ko: "🇰🇷", zh: "🇨🇳", hi: "🇮🇳",
  th: "🇹🇭", vi: "🇻🇳", id: "🇮🇩", ms: "🇲🇾", sv: "🇸🇪", da: "🇩🇰", nb: "🇳🇴",
  fi: "🇫🇮", el: "🇬🇷", cs: "🇨🇿", hu: "🇭🇺", ro: "🇷🇴", hr: "🇭🇷", bg: "🇧🇬",
  sk: "🇸🇰", he: "🇮🇱", uk: "🇺🇦",
};

const QUICK_LOCALES: { value: Locale; label: string }[] = [
  { value: "fr", label: "Français" }, { value: "en", label: "English" },
  { value: "es", label: "Español" }, { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" }, { value: "pt", label: "Português" },
  { value: "nl", label: "Nederlands" }, { value: "ar", label: "العربية" },
  { value: "tr", label: "Türkçe" }, { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" }, { value: "ko", label: "한국어" },
];

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navItems = [
    { icon: LayoutDashboard, label: t("nav.dashboard") || "Dashboard", path: "/client" },
    { icon: Search, label: t("nav.explore") || "Explore", path: "/explore" },
    { icon: CalendarCheck, label: t("nav.bookings") || "My Bookings", path: "/client/bookings" },
    { icon: MessageCircle, label: t("nav.messages") || "Messages", path: "/client/messages" },
    { icon: FileText, label: t("nav.documents") || "Documents", path: "/client/documents" },
    { icon: CreditCard, label: t("nav.payments") || "Payments", path: "/client/payments" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background mobile-safe">
      {sidebarOpen && (
        <div className="sidebar-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[280px] sm:w-64 bg-sidebar flex flex-col transition-transform duration-300 ease-in-out safe-bottom ${sidebarOpen ? "translate-x-0 sidebar-slide-in" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 pt-5 pb-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <AppLogo variant="sidebar" linkTo="/client" />
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-bold tracking-wider text-sidebar-foreground/40 uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">
              Client
            </span>
          </div>
          {user && <p className="text-xs text-sidebar-foreground/50 mt-2 truncate">{user.email}</p>}
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-0.5">
          <Link
            to="/client/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Settings className="h-4 w-4" /> {t("nav.settings") || "Settings"}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4" /> {t("nav.logout") || "Sign out"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center px-3 sm:px-6 gap-2 sm:gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground p-2 -ml-1 rounded-lg hover:bg-muted transition-colors" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />

          {/* Language switcher */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(v => !v)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <span className="text-lg">{LOCALE_FLAGS[locale] || "🌐"}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-lg p-2 z-50 w-40 max-h-72 overflow-y-auto">
                {QUICK_LOCALES.map(l => (
                  <button
                    key={l.value}
                    onClick={() => { setLocale(l.value); setLangOpen(false); }}
                    className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                      locale === l.value ? "bg-accent text-accent-foreground font-medium" : "text-popover-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{LOCALE_FLAGS[l.value]}</span>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ThemeSwitcher />
          <NotificationBell />
        </header>
        <main className="app-main flex-1 p-3 sm:p-6">{children}</main>
        <footer className="py-3 text-center border-t border-border/30">
          <span className="text-xs text-muted-foreground/50 font-medium tracking-wide">EASY-LOCS<sup className="text-[8px]">®</sup></span>
        </footer>
      </div>
    </div>
  );
};

export default ClientLayout;
