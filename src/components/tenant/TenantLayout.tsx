import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, type Locale } from "@/lib/i18n";
import { useTenantProperty } from "@/hooks/useTenantProperty";
import AppLogo from "@/components/AppLogo";
import {
  LayoutDashboard, Receipt, FileText, MessageCircle,
  CreditCard, Settings, LogOut, Menu, X, Star, ClipboardList, Building2,
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeSwitcher from "@/components/ThemeSwitcher";

// Languages are dynamically filtered based on property country + English
const ALL_LANGUAGES: { code: Locale; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "da", label: "Dansk", flag: "🇩🇰" },
  { code: "nb", label: "Norsk", flag: "🇳🇴" },
  { code: "fi", label: "Suomi", flag: "🇫🇮" },
  { code: "el", label: "Ελληνικά", flag: "🇬🇷" },
  { code: "cs", label: "Čeština", flag: "🇨🇿" },
  { code: "hu", label: "Magyar", flag: "🇭🇺" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "hr", label: "Hrvatski", flag: "🇭🇷" },
  { code: "bg", label: "Български", flag: "🇧🇬" },
  { code: "sk", label: "Slovenčina", flag: "🇸🇰" },
  { code: "he", label: "עברית", flag: "🇮🇱" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
];

const TenantLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, activeRole, hasDualRole, switchRole } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const { L, tenantLanguages } = useTenantProperty();

  // Filter languages: only property country language + English
  const LANGUAGES = ALL_LANGUAGES.filter(
    l => tenantLanguages.includes(l.code) || l.code === "en"
  );

  const navItems = [
    { icon: Building2, label: "Property Hub", path: "/property-hub" },
    { icon: LayoutDashboard, label: t("badge.tenant") || L.tenantSpace, path: "/tenant" },
    { icon: Receipt, label: t("nav.receipts") || L.myReceipts, path: "/tenant/receipts" },
    { icon: FileText, label: t("nav.documents") || L.myDocuments, path: "/tenant/documents" },
    { icon: MessageCircle, label: t("nav.messages") || L.messagesNav, path: "/tenant/messages" },
    { icon: CreditCard, label: t("nav.payments") || L.payRent, path: "/dashboard/wallet?context=rent" },
    { icon: Star, label: t("nav.reviews"), path: "/tenant/reviews" },
    { icon: ClipboardList, label: t("nav.requests"), path: "/tenant/requests" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const currentLang = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

  return (
    <div className="min-h-screen flex bg-background mobile-safe">
      {sidebarOpen && (
        <div className="sidebar-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[280px] sm:w-64 bg-sidebar flex flex-col transition-transform duration-300 ease-in-out safe-bottom ${sidebarOpen ? "translate-x-0 sidebar-slide-in" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 pt-5 pb-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <AppLogo variant="sidebar" linkTo="/tenant" />
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2">
            {hasDualRole ? (
              <div className="flex items-center bg-muted/50 rounded-lg p-0.5 w-fit">
                <button
                  onClick={() => { switchRole("landlord"); navigate("/property-hub"); }}
                  className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded transition-colors ${activeRole === "landlord" ? "bg-accent text-accent-foreground" : "text-sidebar-foreground/50 hover:text-sidebar-foreground"}`}
                >
                  {t("badge.landlord")}
                </button>
                <button
                  onClick={() => { switchRole("tenant"); navigate("/tenant"); }}
                  className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded transition-colors ${activeRole === "tenant" ? "bg-accent text-accent-foreground" : "text-sidebar-foreground/50 hover:text-sidebar-foreground"}`}
                >
                  {t("badge.tenant") || L.tenantSpace}
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-bold tracking-wider text-sidebar-foreground/40 uppercase bg-accent/10 text-accent px-2 py-0.5 rounded">{t("badge.tenant") || L.tenantSpace}</span>
            )}
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
            to="/tenant/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Settings className="h-4 w-4" /> {t("nav.settings") || L.settingsNav}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4" /> {t("nav.logout") || L.logoutNav}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center px-3 sm:px-6 gap-2 sm:gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground p-2 -ml-1 rounded-lg hover:bg-muted transition-colors" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
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

export default TenantLayout;