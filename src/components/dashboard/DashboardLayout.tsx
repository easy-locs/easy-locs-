import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { useSubscriptionGating } from "@/hooks/useSubscriptionGating";
import { useCountryContext, appendCountryToPath, isGlobalPage } from "@/hooks/useCountryContext";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import AppLogo from "@/components/AppLogo";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import HubQuickAccess from "@/components/communication-hub/HubQuickAccess";
import {
  LayoutDashboard, Home, Users, KeyRound, FileText, Building,
  Wallet, Wrench, MessageCircle,
  BrainCircuit, Settings, LogOut, Menu, X, CreditCard, Bell,
  Receipt, Compass,
  Layers, Zap, Store, ChevronDown,
  ArrowLeft, Globe, Clock,
  Shield, UsersRound, Banknote, BarChart3, Activity, Bug,
} from "lucide-react";



interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface NavSubGroup {
  label: string;
  items: NavItem[];
}

interface NavSection {
  key: string;
  title: string;
  icon: React.ElementType;
  items: NavItem[];
  subGroups?: NavSubGroup[];
}

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orgSelectorOpen, setOrgSelectorOpen] = useState(false);

  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, subscription, activeRole, hasDualRole, switchRole, orgId, allOrgs, switchOrg } = useAuth();
  const { t } = useI18n();
  const { currentTier, isSubscribed } = useSubscriptionGating();
  const activeCountry = useCountryContext();
  const isDashboardHome = location.pathname === "/dashboard";

  // Get country info for display
  const countryEntry = activeCountry ? getCountryEntryOrDefault(activeCountry) : null;

  // When inside a country, operational links get ?country=XX appended
  const cPath = (path: string) => appendCountryToPath(path, activeCountry);

  // ═══════════════════════════════════════════════════════
  // NAVIGATION: Smart clean structure
  // ═══════════════════════════════════════════════════════

  const FREE_NAV_SECTIONS = new Set(["dashboard", "listings", "marketplace", "orbit", "settings"]);

  const navSections: NavSection[] = [
    // ── A. Dashboard ──
    {
      key: "dashboard",
      title: "Dashboard",
      icon: LayoutDashboard,
      items: [
        { icon: LayoutDashboard, label: t("nav.dashboard") || "Dashboard", path: "/dashboard" },
      ],
    },

    // ── B. Property Management (Gestion Immo) ──
    {
      key: "property",
      title: t("nav.property_mgmt") || "Property Management",
      icon: Home,
      items: [
        { icon: Home, label: t("nav.portfolio") || "Portfolio", path: cPath("/dashboard/rental") },
        { icon: Building, label: t("nav.listings") || "Listings", path: cPath("/dashboard/real-estate") },
        { icon: KeyRound, label: t("nav.rentals") || "Rentals", path: cPath("/dashboard/leases") },
        { icon: Users, label: t("nav.tenants") || "Tenants / Clients", path: cPath("/dashboard/tenants") },
        { icon: FileText, label: t("nav.documents") || "Documents", path: cPath("/dashboard/documents") },
        { icon: Banknote, label: t("nav.accounting") || "Accounting", path: cPath("/dashboard/finances") },
        { icon: Wrench, label: t("nav.interventions") || "Interventions", path: cPath("/dashboard/interventions") },
        { icon: UsersRound, label: t("nav.team") || "Team", path: "/dashboard/collaboration" },
      ],
    },

    // ── C. Shops / Commerce ──
    {
      key: "shops",
      title: t("nav.shops") || "Shops",
      icon: Store,
      items: [
        { icon: Store, label: t("nav.my_shops") || "My Shops", path: "/business/my-shops" },
        { icon: Layers, label: t("nav.catalog") || "Catalog", path: "/dashboard/my-shop" },
        { icon: Receipt, label: t("nav.orders") || "Orders", path: "/my-orders" },
        { icon: UsersRound, label: t("nav.shop_team") || "Team", path: "/dashboard/shop-team" },
      ],
    },

    // ── D. Marketplace ──
    {
      key: "marketplace",
      title: "Marketplace",
      icon: Compass,
      items: [
        { icon: Compass, label: t("nav.discover") || "Discover", path: "/discover" },
        { icon: Zap, label: t("nav.seller_hub") || "Seller Hub", path: "/dashboard/seller" },
      ],
    },

    // ── E. Orbit ──
    {
      key: "orbit",
      title: "Orbit",
      icon: MessageCircle,
      items: [
        { icon: MessageCircle, label: t("nav.messages") || "Messages", path: "/dashboard/communication" },
        { icon: BarChart3, label: t("nav.deals") || "Deals", path: "/dashboard/deals" },
        { icon: Clock, label: t("nav.tracking") || "Tracking", path: "/dashboard/tracking" },
      ],
    },

    // ── F. Wallet ──
    {
      key: "wallet",
      title: t("nav.wallet") || "Wallet",
      icon: Wallet,
      items: [
        { icon: Wallet, label: t("nav.wallet") || "Wallet", path: "/wallet" },
        { icon: CreditCard, label: t("nav.plan") || "Plan & Billing", path: "/dashboard/billing" },
      ],
    },

    // ── G. Settings ──
    {
      key: "settings",
      title: t("nav.settings") || "Settings",
      icon: Settings,
      items: [
        { icon: Settings, label: t("nav.settings") || "Settings", path: "/dashboard/settings" },
        { icon: BrainCircuit, label: "AI Assistant", path: "/dashboard/assistant" },
        { icon: Shield, label: "System Audit", path: "/admin/audit-debug" },
        { icon: Activity, label: "Runtime Audit", path: "/admin/runtime-audit" },
        { icon: Bug, label: "Master Debug", path: "/admin/master-debug" },
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

  // Helper to get all items including subGroups
  const getAllSectionItems = (section: NavSection): NavItem[] => {
    const items = [...section.items];
    if (section.subGroups) {
      for (const sg of section.subGroups) {
        items.push(...sg.items);
      }
    }
    return items;
  };

  const getDefaultOpen = () => {
    const open: Record<string, boolean> = {};
    for (const section of navSections) {
      if (section.key === "dashboard") {
        open[section.key] = true;
        continue;
      }
      open[section.key] = getAllSectionItems(section).some(isItemActive);
    }
    if (!Object.values(open).some(Boolean)) {
      open["dashboard"] = true;
      if (activeCountry) open["real_estate"] = true;
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

          {/* Plan badge only — role switch moved to Property Hub */}
          <div className="mt-2 flex items-center gap-2">
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
              {t("page.dashboard.world_map") || "World Portfolio"}
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl leading-none">{countryEntry.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-sidebar-foreground truncate">{countryEntry.name}</p>
                <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">
                  {t("sidebar.workspace") || "Workspace"}
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
              {t("sidebar.select_country") || "Select a country to get started"}
            </Link>
          </div>
        )}

        {/* Scrollable nav */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto overscroll-contain scrollbar-thin will-change-scroll">
        {navSections.map((section) => {
            const isOpen = openSections[section.key] ?? false;
            const allItems = getAllSectionItems(section);
            const hasActiveItem = allItems.some(isItemActive);
            const isSingleItem = allItems.length === 1 && !section.subGroups;
            const sectionLocked = !isSubscribed && !FREE_NAV_SECTIONS.has(section.key);

            // Hide restricted sections entirely for free accounts
            if (sectionLocked) return null;

            if (isSingleItem) {
              const item = allItems[0];
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
                    <span className="flex-1">{item.label}</span>
                  </Link>
                </div>
              );
            }

            // Render nav item link
            const renderNavItem = (item: NavItem) => {
              const active = isItemActive(item);
              return (
                <Link
                  key={`${section.key}-${item.path}-${item.label}`}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            };

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
                    isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="pl-2 space-y-0.5 pb-1">
                    {/* Flat items (no subGroups) */}
                    {section.items.map(renderNavItem)}

                    {/* Sub-grouped items */}
                    {section.subGroups?.map((sg, sgIdx) => (
                      <div key={sgIdx} className="mt-1.5">
                        <p className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase text-sidebar-foreground/30">
                          {sg.label}
                        </p>
                        {sg.items.map(renderNavItem)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-2 border-t border-sidebar-border shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" /> {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">

        {subscription.isTrial && (
          <div className={`${isDashboardHome ? "mx-3 mt-3 sm:mx-4" : "mx-4 mt-3 sm:mx-6"} flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-lg px-4 py-2.5`}>
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

        <main className={`app-main flex-1 w-full min-w-0 overflow-x-hidden ${isDashboardHome ? "px-0 pt-0 pb-24 lg:pb-6" : "p-3 sm:p-5 lg:p-6 pb-24 lg:pb-6"}`}>
          {children}
        </main>
      </div>


      {/* Bottom nav handled globally by MainBottomNav in App.tsx */}
    </div>
  );
};

export default DashboardLayout;
