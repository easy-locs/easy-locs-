import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, type Locale } from "@/lib/i18n";
import { useTenantProperty } from "@/hooks/useTenantProperty";
import logoEasyloc from "@/assets/logo-easylocs.png";
import {
  LayoutDashboard, Receipt, FileText, MessageCircle,
  CreditCard, Settings, LogOut, Menu, X, Globe, Star, ClipboardList,
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";

const LANGUAGES: { code: Locale; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
];

const TenantLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const { L } = useTenantProperty();

  const navItems = [
    { icon: LayoutDashboard, label: L.tenantSpace, path: "/tenant" },
    { icon: Receipt, label: L.myReceipts, path: "/tenant/receipts" },
    { icon: FileText, label: L.myDocuments, path: "/tenant/documents" },
    { icon: MessageCircle, label: L.messagesNav, path: "/tenant/messages" },
    { icon: CreditCard, label: L.payRent, path: "/tenant/pay" },
    { icon: Star, label: t("nav.reviews"), path: "/tenant/reviews" },
    { icon: ClipboardList, label: t("nav.requests"), path: "/tenant/requests" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const currentLang = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 pt-5 pb-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logoEasyloc} alt="Easy-Locs" className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold text-sidebar-foreground">Easy-Locs</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-bold tracking-wider text-sidebar-foreground/40 uppercase bg-accent/10 text-accent px-2 py-0.5 rounded">{L.tenantSpace}</span>
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
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <Globe className="h-4 w-4" />
              <span>{currentLang.flag} {currentLang.label}</span>
            </button>
            {langOpen && (
              <div className="absolute bottom-full left-0 w-full bg-sidebar border border-sidebar-border rounded-lg shadow-lg mb-1 py-1 z-50">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { setLocale(lang.code); setLangOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-sidebar-accent/50 transition-colors ${locale === lang.code ? "text-accent font-medium" : "text-sidebar-foreground/60"}`}
                  >
                    {lang.flag} {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link
            to="/tenant/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Settings className="h-4 w-4" /> {L.settingsNav}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4" /> {L.logoutNav}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <NotificationBell />
        </header>
        <main className="flex-1 p-6">{children}</main>
        <footer className="py-3 text-center border-t border-border/30">
          <span className="text-xs text-muted-foreground/50 font-medium tracking-wide">EASY-LOCS<sup className="text-[8px]">®</sup></span>
        </footer>
      </div>
    </div>
  );
};

export default TenantLayout;