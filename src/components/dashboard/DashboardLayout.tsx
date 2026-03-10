import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, type Locale } from "@/lib/i18n";
import { useSubscriptionGating } from "@/hooks/useSubscriptionGating";
import { useCountryContext, appendCountryToPath, isGlobalPage } from "@/hooks/useCountryContext";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import AppLogo from "@/components/AppLogo";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import {
  LayoutDashboard, Home, Users, KeyRound, FileText, Building,
  Wallet, Wrench, CheckSquare, MessageCircle,
  BrainCircuit, Settings, LogOut, Menu, X, CreditCard, Bell,
  Receipt, UserSearch, Calendar,
  Layers, BookOpen, Zap, Store, ChevronDown,
  FileCheck, CalendarRange, MapPin, ArrowLeft, Globe, Clock,
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
  const [orgSelectorOpen, setOrgSelectorOpen] = useState(false);

  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, subscription, activeRole, hasDualRole, switchRole, orgId, allOrgs, switchOrg } = useAuth();
  const { locale, setLocale, t, availableLocales } = useI18n();
  const { currentTier } = useSubscriptionGating();
  const activeCountry = useCountryContext();

  // Get country info for display
  const countryEntry = activeCountry ? getCountryEntryOrDefault(activeCountry) : null;

  // When inside a country, operational links get ?country=XX appended
  const cPath = (path: string) => appendCountryToPath(path, activeCountry);

  // ═══════════════════════════════════════════════════════
  // NAVIGATION: Unified clean structure
  // ═══════════════════════════════════════════════════════

  const navSections: NavSection[] = [
    // 1. Dashboard — always visible, single item
    {
      key: "dashboard",
      title: "Dashboard",
      icon: LayoutDashboard,
      items: [
        { icon: LayoutDashboard, label: t("nav.dashboard") || "Dashboard", path: "/dashboard" },
      ],
    },

    // 2. Real Estate — all property business
    {
      key: "real_estate",
      title: t("section.real_estate") || "Real Estate",
      icon: Home,
      items: [
        // Long-term rental
        { icon: Home, label: t("nav.properties") || "Properties", path: cPath("/dashboard/rental") },
        { icon: Users, label: t("nav.tenants") || "Tenants", path: cPath("/dashboard/tenants") },
        { icon: KeyRound, label: t("nav.leases") || "Leases", path: cPath("/dashboard/leases") },
        // Seasonal rental
        { icon: Calendar, label: t("nav.seasonal") || "Seasonal Rentals", path: "/dashboard/seasonal" },
        { icon: CalendarRange, label: t("nav.channel_manager") || "Channel Manager", path: "/dashboard/channel-manager" },
        { icon: Zap, label: t("nav.pricing") || "Dynamic Pricing", path: "/dashboard/pricing" },
        // Sales
        { icon: Building, label: t("nav.real_estate_listings") || "Sales Listings", path: "/dashboard/real-estate" },
        // Calendar & Leads
        { icon: CalendarRange, label: t("nav.calendar") || "Calendar", path: "/dashboard/calendar" },
        { icon: UserSearch, label: t("nav.candidates") || "Leads", path: cPath("/dashboard/candidates") },
      ],
    },

    // 3. Marketplace — services only
    {
      key: "marketplace",
      title: "Marketplace",
      icon: Store,
      items: [
        { icon: Store, label: t("nav.marketplace") || "Services Marketplace", path: "/dashboard/activities" },
        { icon: MapPin, label: t("nav.local_services") || "Local Services", path: "/dashboard/local-services" },
      ],
    },

    // 4. Messages
    {
      key: "messages",
      title: t("nav.messages") || "Messages",
      icon: MessageCircle,
      items: [
        { icon: MessageCircle, label: t("nav.messages") || "Messages", path: cPath("/dashboard/communication") },
      ],
    },

    // 5. Documents
    {
      key: "documents",
      title: t("nav.documents") || "Documents",
      icon: FileText,
      items: [
        { icon: FileText, label: t("nav.documents") || "Documents", path: cPath("/dashboard/documents") },
        { icon: Wrench, label: t("nav.interventions") || "Interventions", path: cPath("/dashboard/interventions") },
        { icon: CheckSquare, label: t("nav.tasks") || "Tasks", path: cPath("/dashboard/tasks") },
      ],
    },

    // 6. Accounting
    {
      key: "accounting",
      title: t("nav.accounting") || "Accounting",
      icon: Wallet,
      items: [
        { icon: Wallet, label: t("nav.finances") || "Finances", path: cPath("/dashboard/finances") },
        { icon: Receipt, label: t("nav.expenses") || "Expenses", path: cPath("/dashboard/expenses") },
        { icon: Bell, label: t("nav.notices") || "Payment Notices", path: cPath("/dashboard/notices") },
        { icon: BookOpen, label: t("nav.accounting") || "Accounting", path: cPath("/dashboard/accounting") },
        { icon: FileCheck, label: t("nav.fiscal") || "Fiscal Report", path: cPath("/dashboard/fiscal") },
      ],
    },
  ];

  // Determine active items
  const isItemActive = (item: NavItem) => {
    const currentFull = location.pathname + location.search;
    if (currentFull === item.path) return true;
    // Check path without query params
    const itemBase = item.path.split("?")[0];
    if (location.pathname === itemBase && !item.path.includes("?")) return true;
    return false;
  };

  const getDefaultOpen = () => {
    const open: Record<string, boolean> = {};
    for (const section of navSections) {
      if (section.key === "dashboard") {
        open[section.key] = true;
        continue;
      }
      open[section.key] = section.items.some(isItemActive);
    }
    if (!Object.values(open).some(Boolean)) {
      open["dashboard"] = true;
      if (activeCountry) open["property"] = true;
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
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[280px] sm:w-64 bg-sidebar flex flex-col safe-bottom transition-transform duration-300 ease-in-out ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header: Logo + role switch */}
        <div className="px-4 pt-4 pb-3 border-b border-sidebar-border shrink-0">
          <div className="flex items-center justify-between">
            <AppLogo variant="sidebar" linkTo="/dashboard" />
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

          {/* Multi-org switcher */}
          {allOrgs.length > 1 && (
            <div className="mt-2 relative">
              <button
                onClick={() => setOrgSelectorOpen(!orgSelectorOpen)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs bg-muted/50 hover:bg-muted transition-colors text-sidebar-foreground/70"
              >
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate flex-1 text-left">
                  {allOrgs.find(o => o.id === orgId)?.name || "Select workspace"}
                </span>
                <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${orgSelectorOpen ? "rotate-180" : ""}`} />
              </button>
              {orgSelectorOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOrgSelectorOpen(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-50 max-h-48 overflow-y-auto">
                    {allOrgs.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => { switchOrg(org.id); setOrgSelectorOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors ${
                          orgId === org.id ? "text-accent font-semibold" : "text-foreground"
                        }`}
                      >
                        <Store className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{org.name}</span>
                        {orgId === org.id && <span className="ml-auto text-accent">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ═══ Country Context Banner ═══ */}
        {activeCountry && countryEntry && (
          <div className="px-3 py-2.5 border-b border-sidebar-border bg-sidebar-accent/30">
            <Link
              to="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-1.5 text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors mb-1.5"
            >
              <ArrowLeft className="h-3 w-3" />
              {t("page.dashboard.world_map") || "Portefeuille mondial"}
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl leading-none">{countryEntry.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-sidebar-foreground truncate">{countryEntry.name}</p>
                <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">
                  {t("sidebar.workspace") || "Espace de travail"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ No-country hint ═══ */}
        {!activeCountry && !isGlobalPage(location.pathname) && (
          <div className="px-3 py-2.5 border-b border-sidebar-border bg-accent/5">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-xs text-accent hover:underline"
            >
              <Globe className="h-3.5 w-3.5" />
              {t("sidebar.select_country") || "Sélectionnez un pays pour commencer"}
            </Link>
          </div>
        )}

        {/* Scrollable nav */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto overscroll-contain scrollbar-thin">
          {navSections.map((section) => {
            const isOpen = openSections[section.key] ?? false;
            const hasActiveItem = section.items.some(isItemActive);
            const isSingleItem = section.items.length === 1;

            if (isSingleItem) {
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
            to="/dashboard/assistant"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-sidebar-accent/50 text-sidebar-primary hover:bg-sidebar-accent transition-colors"
          >
            <BrainCircuit className="h-4 w-4 shrink-0" /> {t("nav.assistant") || "AI Assistant"}
          </Link>
          <Link
            to="/dashboard/billing"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              location.pathname === "/dashboard/billing"
                ? "bg-sidebar-accent text-sidebar-primary font-medium"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <CreditCard className="h-4 w-4 shrink-0" /> {t("nav.billing") || "Subscription"}
          </Link>
          <Link
            to="/dashboard/settings"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              location.pathname === "/dashboard/settings"
                ? "bg-sidebar-accent text-sidebar-primary font-medium"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
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

          {/* Country breadcrumb in header */}
          {activeCountry && countryEntry && (
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-lg">{countryEntry.flag}</span>
              <span className="font-semibold text-foreground">{countryEntry.name}</span>
            </div>
          )}

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
          <ThemeSwitcher />
          <NotificationBell />
          <Link
            to="/dashboard/assistant"
            className="hidden sm:flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-3 py-2 rounded-lg shadow-gold hover:opacity-90 transition-opacity"
          >
            <BrainCircuit className="h-4 w-4" />
            <span>{t("dashboard.ai_question")}</span>
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

        <main className="app-main flex-1 p-4 sm:p-6 pb-24 sm:pb-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
