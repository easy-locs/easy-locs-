import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoAdminia from "@/assets/logo-adminia.png";
import { Clock } from "lucide-react";
import {
  LayoutDashboard,
  Home,
  ChevronDown,
  Users,
  KeyRound,
  CalendarRange,
  ClipboardList,
  FileCheck,
  Wallet,
  FileText,
  Contact,
  Wrench,
  CheckSquare,
  StickyNote,
  MessageCircle,
  BrainCircuit,
  Settings,
  LogOut,
  Menu,
  X,
  CreditCard,
  ShieldCheck,
  Building2,
  Bell,
  FolderLock,
  Globe,
} from "lucide-react";

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "L'ESSENTIEL",
    items: [
      { icon: LayoutDashboard, label: "Bureau", path: "/dashboard" },
      { icon: Home, label: "Biens", path: "/dashboard/rental" },
      { icon: Users, label: "Locataires", path: "/dashboard/tenants" },
      { icon: KeyRound, label: "Locations", path: "/dashboard/leases" },
      { icon: ClipboardList, label: "Inventaires", path: "/dashboard/vault" },
      { icon: FileCheck, label: "État des lieux", path: "/dashboard/receipts" },
      { icon: Wallet, label: "Finances", path: "/dashboard/finances" },
      { icon: CalendarRange, label: "Régul. charges", path: "/dashboard/charges" },
      { icon: FileCheck, label: "Bilan fiscal", path: "/dashboard/fiscal" },
      { icon: FileText, label: "Documents", path: "/dashboard/documents" },
    ],
  },
  {
    title: "LE PLUS",
    items: [
      { icon: Contact, label: "Carnet", path: "/dashboard/company" },
      { icon: Wrench, label: "Interventions", path: "/dashboard/interventions" },
      { icon: CheckSquare, label: "Tâches", path: "/dashboard/tasks" },
      { icon: StickyNote, label: "Notes", path: "/dashboard/notes" },
      { icon: MessageCircle, label: "Messages", path: "/dashboard/messages" },
      { icon: Bell, label: "Rappels", path: "/dashboard/reminders" },
    ],
  },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, subscription } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header with user info */}
        <div className="px-5 pt-5 pb-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logoAdminia} alt="Adminia" className="h-7 w-7 rounded" />
              <span className="text-lg font-bold text-sidebar-foreground">Adminia</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {user && (
            <p className="text-xs text-sidebar-foreground/50 mt-2 truncate">{user.email}</p>
          )}
        </div>

        <nav className="flex-1 py-2 px-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="mb-3">
              <p className="px-3 py-2 text-[11px] font-bold tracking-wider text-sidebar-foreground/40 uppercase">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = location.pathname === item.path;
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
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-0.5">
          <Link
            to="/dashboard/billing"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Abonnement
          </Link>
          <Link
            to="/dashboard/services"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Globe className="h-4 w-4" />
            Services
          </Link>
          <Link
            to="/dashboard/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <ShieldCheck className="h-4 w-4" />
            Admin
          </Link>
          <Link
            to="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Paramètres
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <Link
            to="/dashboard/assistant"
            className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2 rounded-lg shadow-gold hover:opacity-90 transition-opacity"
          >
            <BrainCircuit className="h-4 w-4" />
            <span className="hidden sm:inline">Que dois-je faire ?</span>
          </Link>
        </header>

        {/* Trial banner */}
        {subscription.isTrial && (
          <div className="mx-6 mt-4 flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-lg px-4 py-2.5">
            <Clock className="h-4 w-4 text-accent shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">Essai gratuit</span>
              {subscription.trialDaysLeft != null && (
                <span className="text-muted-foreground">
                  {" — "}{subscription.trialDaysLeft} jour{subscription.trialDaysLeft > 1 ? "s" : ""} restant{subscription.trialDaysLeft > 1 ? "s" : ""}
                </span>
              )}
            </p>
            <Link
              to="/dashboard/billing"
              className="ml-auto text-xs font-semibold text-accent hover:underline whitespace-nowrap"
            >
              Choisir un plan
            </Link>
          </div>
        )}

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
