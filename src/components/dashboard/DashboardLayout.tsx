import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, type Locale } from "@/lib/i18n";
import { useSubscriptionGating } from "@/hooks/useSubscriptionGating";
import logoEasyloc from "@/assets/logo-easyloc.png";
import NotificationBell from "@/components/notifications/NotificationBell";
import {
  LayoutDashboard, Home, Users, KeyRound, CalendarRange, ClipboardList, FileCheck, Building,
  Wallet, FileText, Contact, Wrench, CheckSquare, StickyNote, MessageCircle,
  BrainCircuit, Settings, LogOut, Menu, X, CreditCard, Bell,
  Receipt, UserSearch, Calendar, AlertTriangle, Sofa, Clock, Globe, Lock,
} from "lucide-react";

const LOCALE_FLAGS: Record<Locale, string> = { fr: "🇫🇷", en: "🇬🇧", es: "🇪🇸", de: "🇩🇪", it: "🇮🇹", pt: "🇵🇹" };

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, subscription } = useAuth();
  const { locale, setLocale, t, availableLocales } = useI18n();
  const { currentTier, isSubscribed } = useSubscriptionGating();

  const navSections = [
    {
      title: t("section.essential"),
      items: [
        { icon: LayoutDashboard, label: t("nav.dashboard"), path: "/dashboard" },
        { icon: Building, label: t("nav.buildings"), path: "/dashboard/buildings" },
        { icon: Home, label: t("nav.properties"), path: "/dashboard/rental" },
        { icon: Users, label: t("nav.tenants"), path: "/dashboard/rental?tab=tenants" },
        { icon: KeyRound, label: t("nav.leases"), path: "/dashboard/leases" },
        { icon: ClipboardList, label: t("nav.inventory"), path: "/dashboard/rental?tab=inventory" },
        { icon: Sofa, label: t("nav.furniture"), path: "/dashboard/furniture" },
        { icon: Wallet, label: t("nav.finances"), path: "/dashboard/finances" },
        { icon: Receipt, label: t("nav.expenses"), path: "/dashboard/expenses" },
        { icon: CalendarRange, label: t("nav.charges"), path: "/dashboard/charges" },
        { icon: FileCheck, label: t("nav.fiscal"), path: "/dashboard/fiscal" },
        { icon: FileText, label: t("nav.documents"), path: "/dashboard/documents" },
      ],
    },
    {
      title: t("section.rental"),
      items: [
        { icon: Calendar, label: t("nav.seasonal"), path: "/dashboard/seasonal" },
        { icon: UserSearch, label: t("nav.candidates"), path: "/dashboard/candidates" },
        { icon: Receipt, label: t("nav.notices"), path: "/dashboard/notices" },
        { icon: AlertTriangle, label: t("nav.dunning"), path: "/dashboard/dunning" },
      ],
    },
    {
      title: t("section.more"),
      items: [
        { icon: Contact, label: t("nav.company"), path: "/dashboard/company" },
        { icon: Wrench, label: t("nav.interventions"), path: "/dashboard/interventions" },
        { icon: CheckSquare, label: t("nav.tasks"), path: "/dashboard/tasks" },
        { icon: StickyNote, label: t("nav.notes"), path: "/dashboard/notes" },
        { icon: MessageCircle, label: t("nav.messages"), path: "/dashboard/messages" },
        { icon: Bell, label: t("nav.reminders"), path: "/dashboard/reminders" },
      ],
    },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 pt-5 pb-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logoEasyloc} alt="Easyloc" className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold text-sidebar-foreground">Easyloc</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider text-sidebar-foreground/40 uppercase bg-accent/10 text-accent px-2 py-0.5 rounded">{t("badge.landlord")}</span>
            <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded ${currentTier === "global" ? "bg-[hsl(45,90%,50%)]/20 text-[hsl(45,90%,40%)]" : currentTier === "local" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
              {currentTier === "global" ? "Global" : currentTier === "local" ? "Local" : "Free"}
            </span>
          </div>
          {user && <p className="text-xs text-sidebar-foreground/50 mt-2 truncate">{user.email}</p>}
        </div>

        <nav className="flex-1 py-2 px-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="mb-3">
              <p className="px-3 py-2 text-[11px] font-bold tracking-wider text-sidebar-foreground/40 uppercase">{section.title}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = location.pathname + location.search === item.path || (location.pathname === item.path && !item.path.includes("?"));
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-0.5">
          <Link to="/dashboard/billing" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <CreditCard className="h-4 w-4" /> {t("nav.billing")}
          </Link>
          <Link to="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <Settings className="h-4 w-4" /> {t("nav.settings")}
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <LogOut className="h-4 w-4" /> {t("nav.logout")}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          {/* Language selector */}
          <div className="relative">
            <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Globe className="h-4 w-4" />
              <span>{LOCALE_FLAGS[locale]}</span>
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
                  {availableLocales.map(l => (
                    <button key={l.value} onClick={() => { setLocale(l.value); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors ${locale === l.value ? "text-accent font-medium" : "text-foreground"}`}>
                      <span>{LOCALE_FLAGS[l.value]}</span>{l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <NotificationBell />
          <Link to="/dashboard/assistant" className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
            <BrainCircuit className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dashboard.ai_question")}</span>
          </Link>
        </header>

        {subscription.isTrial && (
          <div className="mx-6 mt-4 flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-lg px-4 py-2.5">
            <Clock className="h-4 w-4 text-accent shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">{t("trial.free")}</span>
              {subscription.trialDaysLeft != null && (
                <span className="text-muted-foreground">
                  {" — "}{subscription.trialDaysLeft} {t("trial.days_left")}
                </span>
              )}
            </p>
            <Link to="/dashboard/billing" className="ml-auto text-xs font-semibold text-accent hover:underline whitespace-nowrap">{t("trial.choose_plan")}</Link>
          </div>
        )}

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
