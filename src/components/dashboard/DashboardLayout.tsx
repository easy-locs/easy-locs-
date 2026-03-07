import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, type Locale } from "@/lib/i18n";
import { useSubscriptionGating } from "@/hooks/useSubscriptionGating";
import logoEasyloc from "@/assets/logo-easylocs.png";
import NotificationBell from "@/components/notifications/NotificationBell";
import {
  LayoutDashboard, Home, Users, KeyRound, ClipboardList, FileText, Building,
  Wallet, Contact, Wrench, CheckSquare, MessageCircle,
  BrainCircuit, Settings, LogOut, Menu, X, CreditCard, Bell,
  Receipt, UserSearch, Calendar, AlertTriangle, Sofa, Clock, Gift, Shield,
  Layers, BookOpen, Zap, Store, Code, ChevronDown,
  FileCheck, CalendarRange, Handshake, MapPin,
} from "lucide-react";

const LOCALE_FLAGS: Record<Locale, string> = { fr: "🇫🇷", en: "🇬🇧", es: "🇪🇸", de: "🇩🇪", it: "🇮🇹", pt: "🇵🇹", nl: "🇳🇱", pl: "🇵🇱", tr: "🇹🇷", ar: "🇸🇦", ja: "🇯🇵", ko: "🇰🇷", zh: "🇨🇳", hi: "🇮🇳", th: "🇹🇭", vi: "🇻🇳", id: "🇮🇩", ms: "🇲🇾", sv: "🇸🇪", da: "🇩🇰", nb: "🇳🇴", fi: "🇫🇮", el: "🇬🇷", cs: "🇨🇿", hu: "🇭🇺", ro: "🇷🇴", hr: "🇭🇷", bg: "🇧🇬", sk: "🇸🇰", he: "🇮🇱", uk: "🇺🇦" };

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface NavSection {
  key: string;
  title: string;
  icon: React.ElementType;
  items: NavItem[];
}

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, subscription, activeRole, hasDualRole, switchRole } = useAuth();
  const { locale, setLocale, t, availableLocales } = useI18n();
  const { currentTier } = useSubscriptionGating();

  const navSections: NavSection[] = [
    {
      key: "dashboard",
      title: "Dashboard",
      icon: LayoutDashboard,
      items: [
        { icon: LayoutDashboard, label: t("nav.dashboard") || "Portefeuille mondial", path: "/dashboard" },
      ],
    },
    {
      key: "seasonal",
      title: t("section.rental") || "Saisonnier",
      icon: Calendar,
      items: [
        { icon: Calendar, label: t("nav.seasonal") || "Locations saisonnières", path: "/dashboard/seasonal" },
        { icon: Layers, label: t("nav.channel_manager") || "Channel Manager", path: "/dashboard/channel-manager" },
        { icon: MapPin, label: "Activités & Services", path: "/dashboard/local-services" },
      ],
    },
  ];

  // Determine which sections should be open by default (active route inside)
  const isItemActive = (item: NavItem) =>
    location.pathname + location.search === item.path ||
    (location.pathname === item.path && !item.path.includes("?"));

  const getDefaultOpen = () => {
    const open: Record<string, boolean> = {};
    for (const section of navSections) {
      // Dashboard section is always "open" (single item, no collapsing needed visually)
      if (section.key === "dashboard") {
        open[section.key] = true;
        continue;
      }
      open[section.key] = section.items.some(isItemActive);
    }
    // If nothing is active, open the first real section
    if (!Object.values(open).some(Boolean)) {
      open["dashboard"] = true;
      open["property"] = true;
    }
    return open;
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(getDefaultOpen);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background mobile-safe">
      {sidebarOpen && (
        <div className="sidebar-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[280px] sm:w-64 bg-sidebar flex flex-col transition-transform duration-300 ease-in-out safe-bottom ${
          sidebarOpen ? "translate-x-0 sidebar-slide-in" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header: Logo + role switch */}
        <div className="px-4 pt-4 pb-3 border-b border-sidebar-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={logoEasyloc}
                alt="EASY-LOCS"
                className="h-9 w-auto object-contain drop-shadow-md"
                style={{ filter: "none", border: "none", outline: "none" }}
              />
              <span className="text-lg font-bold tracking-tight text-sidebar-foreground whitespace-nowrap">
                EASY-LOCS<sup className="text-[8px] align-super ml-0.5 text-sidebar-foreground/60">®</sup>
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Role switch + plan badge */}
          <div className="mt-2 flex items-center gap-2">
            {hasDualRole ? (
              <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
                <button
                  onClick={() => { switchRole("landlord"); navigate("/dashboard"); }}
                  className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded transition-colors ${
                    activeRole === "landlord"
                      ? "bg-accent text-accent-foreground"
                      : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
                  }`}
                >
                  {t("badge.landlord")}
                </button>
                <button
                  onClick={() => { switchRole("tenant"); navigate("/tenant"); }}
                  className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded transition-colors ${
                    activeRole === "tenant"
                      ? "bg-accent text-accent-foreground"
                      : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
                  }`}
                >
                  {t("badge.tenant") || "Locataire"}
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-bold tracking-wider text-sidebar-foreground/40 uppercase bg-accent/10 text-accent px-2 py-0.5 rounded">
                {t("badge.landlord")}
              </span>
            )}
            <span
              className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded ${
                currentTier === "global"
                  ? "bg-[hsl(45,90%,50%)]/20 text-[hsl(45,90%,40%)]"
                  : currentTier === "local"
                  ? "bg-accent/10 text-accent"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {currentTier === "global" ? "Global" : currentTier === "local" ? "Local" : "Free"}
            </span>
          </div>
          {user && (
            <p className="text-xs text-sidebar-foreground/50 mt-2 truncate">{user.email}</p>
          )}
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto overscroll-contain scrollbar-thin">
          {navSections.map((section) => {
            const isOpen = openSections[section.key] ?? false;
            const hasActiveItem = section.items.some(isItemActive);
            const isSingleItem = section.key === "dashboard";

            if (isSingleItem) {
              // Render single dashboard link without collapsible wrapper
              const item = section.items[0];
              const active = isItemActive(item);
              return (
                <div key={section.key} className="mb-1">
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </div>
              );
            }

            return (
              <div key={section.key} className="mb-1">
                {/* Section header — clickable to toggle */}
                <button
                  onClick={() => toggleSection(section.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] font-bold tracking-wider uppercase transition-colors ${
                    hasActiveItem
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground/40 hover:text-sidebar-foreground/60"
                  }`}
                >
                  <section.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-left">{section.title}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                </button>

                {/* Collapsible items */}
                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="pl-2 space-y-0.5 pb-1">
                    {section.items.map((item) => {
                      const active = isItemActive(item);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            active
                              ? "bg-sidebar-accent text-sidebar-primary"
                              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          }`}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-2 border-t border-sidebar-border space-y-0.5 shrink-0">
          <Link
            to="/dashboard/billing"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <CreditCard className="h-4 w-4 shrink-0" /> {t("nav.billing")}
          </Link>
          <Link
            to="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Settings className="h-4 w-4 shrink-0" /> {t("nav.settings")}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" /> {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center px-3 sm:px-6 gap-2 sm:gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground p-2 -ml-1 rounded-lg hover:bg-muted transition-colors" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <span className="text-lg">{LOCALE_FLAGS[locale]}</span>
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-50 min-w-[140px] max-h-64 overflow-y-auto">
                  {availableLocales.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => { setLocale(l.value); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors ${
                        locale === l.value ? "text-accent font-medium" : "text-foreground"
                      }`}
                    >
                      <span>{LOCALE_FLAGS[l.value]}</span>
                      {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <NotificationBell />
          <Link
            to="/dashboard/assistant"
            className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-3 py-2 rounded-lg shadow-gold hover:opacity-90 transition-opacity"
          >
            <BrainCircuit className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dashboard.ai_question")}</span>
          </Link>
        </header>

        {subscription.isTrial && (
          <div className="mx-4 sm:mx-6 mt-4 flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-lg px-4 py-2.5">
            <Clock className="h-4 w-4 text-accent shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">{t("trial.free")}</span>
              {subscription.trialDaysLeft != null && (
                <span className="text-muted-foreground">
                  {" — "}
                  {subscription.trialDaysLeft} {t("trial.days_left")}
                </span>
              )}
            </p>
            <Link
              to="/dashboard/billing"
              className="ml-auto text-xs font-semibold text-accent hover:underline whitespace-nowrap"
            >
              {t("trial.choose_plan")}
            </Link>
          </div>
        )}

        <main className="flex-1 p-3 sm:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
